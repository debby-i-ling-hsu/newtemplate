# 基礎設施技術參考

Docker 建置、compose 服務、entrypoints、部署腳本、備份的實作細節。
部署操作步驟見 [DEPLOYMENT.md](DEPLOYMENT.md)；整體拓撲與設計理由見 [ARCHITECTURE.md](ARCHITECTURE.md)。

---

## 1. Docker 多階段建置（`dockerfiles/Dockerfile.web`）

一份 Dockerfile，多 stage，產出 web / worker / beat 三個 target（**共用 runtime，只差 entrypoint**，確保三者跑同一份程式碼）。

```
python-base ─┬─ frontend-builder (node:20-alpine)  npm ci → npm run build → dist
             ├─ builder          (python-base+gcc) venv + pip install requirements
             └─ runtime          (python-base+curl/libpq5，不含編譯工具)
                  ├─ web           runtime + 複製 frontend/dist + entrypoint-web.sh
                  ├─ celery-worker runtime + entrypoint-celery-worker.sh
                  └─ celery-beat   runtime + entrypoint-celery-beat.sh
```

要點：

- **前端在 image 內 build**：`frontend-builder` 產出 `dist`，`web` target 複製進來，由 Django/WhiteNoise 同網域服務（stage/prod 不需獨立前端容器）。
- **builder / runtime 分離**：編譯工具（`build-essential`、`libpq-dev`）只在 builder，runtime 只留 `curl` + `libpq5`，image 精簡。
- venv 放 `/opt/venv`，`PATH` 已含；`PYTHONPATH=/app/backend`。
- 用 BuildKit cache mount（`--mount=type=cache`）加速 npm / pip。
- `db-backup` 另有 `Dockerfile.db-backup`（cron + pg_dump sidecar）。

---

## 2. Compose 服務（dev：`docker-compose.dev.yml`）

| 服務 | image / target | 說明 |
|------|------|------|
| `web` | Dockerfile target `web` | `:8000`；dev 用 `runserver --nostatic`、掛載 `./backend`(rw) 與 `./frontend`(ro)；healthcheck 打 `/healthz/live/` |
| `worker-default` | target `celery-worker` | Q=`default`，concurrency 2 |
| `worker-maintenance` | target `celery-worker` | Q=`maintenance`，concurrency 1 |
| `worker-long-running` | target `celery-worker` | Q=`long_running`，concurrency 1 |
| `beat` | target `celery-beat` | DatabaseScheduler |
| `vite` | `node:20-alpine` | `:3000`；先 build 一份 dist 給 `:8000`，再開 `build --watch` + dev server；proxy 到 `web:8000` |
| `redis` | `redis:7-alpine` | appendonly；healthcheck `redis-cli ping` |
| `db` | `postgres:16-alpine` | healthcheck `pg_isready` |

共用設定用 YAML anchor（`x-app-environment`、`x-worker`）。每個 worker 用環境變數區分：`CELERY_WORKER_QUEUES`、`CELERY_WORKER_NAME`、`CELERY_WORKER_CONCURRENCY`、`LOG_SERVICE_NAME`。

- **依賴順序**：worker/beat/web 都 `depends_on` db + redis 的 `service_healthy`。
- **volumes**：`postgres_dev_data`、`redis_dev_data`、`vite_node_modules`。
- **network**：`newtemplate_net`（stage/prod 為 external bridge，供 VPS 上的 Caddy 連入）。
- `COMPOSE_PROJECT_NAME=newtemplate`（Makefile / deploy.sh / db.sh 共用，`compose exec` 才打到同一組容器）。

> dev 雙入口：`:3000`（Vite/HMR）+ `:8000`（Django 同網域，模擬 stage/prod）。stage/prod compose 拿掉程式碼掛載與 vite，web 用 uvicorn，並加 `db-backup` sidecar；見 [DEPLOYMENT.md](DEPLOYMENT.md)。

---

## 3. Entrypoints（`backend/entrypoints/`）

| 檔案 | 行為 |
|------|------|
| `entrypoint-web.sh` | `migrate --noinput` →（可選 `collectstatic`，由 `DJANGO_COLLECTSTATIC_ON_START=1`）→ compose 有 command 就用它（dev=runserver），否則 `uvicorn config.asgi:application`（`UVICORN_WORKERS` 預設 2、`--proxy-headers --forwarded-allow-ips="*"`） |
| `entrypoint-celery-worker.sh` | ping broker 等它起來 → 偵測 `DB_USE_POOL`+prefork 衝突就關 pool → `celery worker`（佇列 / 並發 / hostname 由 env，`--max-tasks-per-child=100`） |
| `entrypoint-celery-beat.sh` | ping broker → `celery beat`（DatabaseScheduler） |

Celery 相關細節見 [CELERY.md](CELERY.md)。

---

## 4. 安全部署（`scripts/deploy.sh`）

`make stage` / `make prod` 呼叫。系統穩定性的核心，**任一步失敗自動回滾 image**。

```
1. 儲存閘門   stage/prod 必須 Azure Blob；prod 帳號 ≠ stage 帳號（讀 .env 比對）
2. 記住舊 image  web/worker/beat 的 image id，供回滾
3. 建置        compose config -q（驗 compose）→ build web/worker/beat → 起 db+redis
4. 備份 DB     scripts/db.sh dump <env> → backups/<env>_<時間>.sql.gz（沒備份成功就中止）
5. migrate     compose run web manage.py migrate --noinput
6. 部署檢查    manage.py check --deploy
7. 換上新 web  up -d web（此後 rollback_needed=1）
8. 滾動重啟    stop beat(30s) + workers(120s) → up workers + beat → up db-backup sidecar
9. 健康閘門    輪詢 /healthz/ready/ 變綠（最多 24 次 ×5s ≈ 2 分），逾時中止
10. 儲存 smoke  manage.py storage_smoke_test（真打雲端讀寫）
```

- 回滾：`trap` 在失敗時把舊 image 重新 tag 回去並 `up -d`，線上維持舊版可用。
- `check --deploy` 抓 production 設定問題（DEBUG、SECRET_KEY、HSTS、SSL…）。
- 健康閘門用 `/healthz/ready/`（DB/Redis/queue/worker 都得 ok，見 [BACKEND.md §7](BACKEND.md)）。

---

## 5. CD（`.github/workflows/deploy.yml`）

「分支即環境」：push `stage` → 部署 stage；push `prod` → 部署 prod；手動 dispatch 可指定環境（救援）。需要 GitHub Secrets：`DEPLOY_SSH_HOST`、`DEPLOY_SSH_USER`、`DEPLOY_SSH_KEY`、`DEPLOY_APP_PATH`。SSH 進主機跑 `scripts/deploy.sh`。CI（測試/lint）見 [DEVELOPMENT.md §7](DEVELOPMENT.md)。

---

## 6. 備份 / 還原（`scripts/db.sh`）

dev/stage/prod 共用，CLI 與排程 sidecar 都走它，命名一致 `backups/<env>_<YYYYMMDD_HHMMSS>.sql.gz`（不進版控）。

- **自動備份**：stage/prod 的 `db-backup` sidecar（`Dockerfile.db-backup`，crond）依 `BACKUP_SCHEDULE`（預設每日 03:00）跑 `db.sh dump`，並 prune 只留最近 `BACKUP_KEEP`（預設 7）份。
- **手動**：`make <env>-dump` / `make <env>-restore [FILE=… | ANY] [YES]`。
- **還原是破壞性**（DROP+CREATE）：先 `gzip -t` 驗證 → 踢連線 → 重建 DB → 濾掉 OWNER/GRANT（跨環境 / 不同角色也能還原）。預設要求輸入 `yes`，`YES` 旗標可略過（CI）。

操作細節與跨環境遷移見 [DEPLOYMENT.md](DEPLOYMENT.md)。

---

## 7. 反向代理（Caddy，不在 repo）

伺服器上獨立的 Caddy 終結 TLS、處理 HSTS / 安全 header，以服務 alias 反代 `newtemplate-web:8000`。需與應用同在 `newtemplate_net`（external network）。範例 `docs/Caddyfile.example`，串接見 [DEPLOYMENT.md](DEPLOYMENT.md)。

---

## 8. 環境拓撲

```
使用者 ──TLS──▶ Caddy（反代，不在 repo）──▶ web:8000 (uvicorn/Django + 前端 dist)
                                            ├─▶ PostgreSQL 16
                                            ├─▶ Redis 7 ──▶ Celery workers ×3 + beat
                                            └─▶ Azure Blob（media，stage/prod）
```

詳見 [ARCHITECTURE.md](ARCHITECTURE.md)。
</content>
