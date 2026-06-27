# 部署

## 概念

- 應用以 `docker compose`（stage/prod）跑在 VPS 上。
- 伺服器上另有一個**獨立的 Caddy**（不在本 repo）做反向代理、TLS、安全 header。它連到同一個 Docker external network，以服務名反代 `web:8000`。
- stage/prod 不需要獨立前端服務；Vite build 會打進 Django web image，由同一個 URL 提供 Web SPA、`/api/v1/` 與 `/admin/`。
- 部署一律走 `scripts/deploy.sh`（`make stage` / `make prod`），內含備份、migrate、健康閘門與失敗自動回滾。

## 前置作業（每台主機一次）

```bash
# 1) 建立 external network（prod compose 用 external network；Caddy 也接這個）
docker network create newtemplate_net

# 2) 準備祕密檔（不進版控）
cp backend/env/.env.stage.example backend/env/.env.stage   # 填入真實值
cp backend/env/.env.prod.example  backend/env/.env.prod

# 3) 確認 stage/prod 用 Azure Blob，且兩者帳號不同（deploy.sh 會擋）
```

`.env.stage` / `.env.prod` 必填重點：
- `SECRET_KEY`、`ALLOWED_HOSTS`、`CSRF_TRUSTED_ORIGINS`
- `DATABASE_URL` 與 `POSTGRES_PASSWORD`（兩處密碼要一致）
- `DEFAULT_FILE_STORAGE=storages.backends.azure_storage.AzureStorage`、`AZURE_ACCOUNT_NAME`、`AZURE_ACCOUNT_KEY`、`AZURE_CONTAINER`
- `DDOS_TRUSTED_PROXY_COUNT=1`（Caddy 是唯一反代）

## 部署

```bash
make stage    # 部署 stage
make prod     # 部署 prod
```

流程（任一步失敗自動回滾 image）：
1. 儲存閘門：stage/prod 必須 Azure，prod 帳號 ≠ stage 帳號。
2. 備份 DB（`scripts/db.sh dump <env>` → `backups/<env>_<時間>.sql.gz`）。
3. build → `migrate` → `check --deploy`。
4. 換上新 web → 滾動重啟 worker/beat → 起 db-backup 排程 sidecar。
5. 等 `/healthz/ready/` 變綠（最多約 2 分鐘）。
6. `storage_smoke_test` 實打雲端儲存。

## 自動部署（CD）

`.github/workflows/deploy.yml`，採「分支即環境」模型：
- push 到 `stage` 分支（預設整合分支）→ 自動部署 stage。
- push 到 `prod` 分支 → 自動部署 prod（一般做法：把驗過的 `stage` merge 進 `prod`）。
- 手動 dispatch 可指定環境（救援用）。

需要的 GitHub Secrets：`DEPLOY_SSH_HOST`、`DEPLOY_SSH_USER`、`DEPLOY_SSH_KEY`、`DEPLOY_APP_PATH`。

## Caddy（在伺服器上，不在 repo）

把應用接進 Caddy 的反向代理即可。完整範例見 [`Caddyfile.example`](Caddyfile.example)。重點：

```caddy
your-domain.com {
    import cloudflare_tls
    encode zstd gzip

    @health path /healthz/live/
    handle @health {
        reverse_proxy newtemplate-web:8000
    }

    handle {
        reverse_proxy newtemplate-web:8000
    }
}
```

> Caddy 容器需與應用在同一個 `newtemplate_net`（external network），才能用服務 alias `newtemplate-web` 連到後端。

## 備份 / 還原 / 跨環境遷移

備份機制統一在 `scripts/db.sh`（dev/stage/prod 共用），CLI 與排程 sidecar 都走它，命名一致（`backups/<env>_<YYYYMMDD_HHMMSS>.sql.gz`）。備份檔不進版控（見 `.gitignore`）。

**自動備份**：stage/prod compose 含 `db-backup` 排程 sidecar（`dockerfiles/Dockerfile.db-backup`），用 `crond` 依 `BACKUP_SCHEDULE`（預設每日 03:00）呼叫 `scripts/db.sh dump`，並 `prune` 只保留最近 `BACKUP_KEEP`（預設 7）份。它掛載 repo 工作區與 docker socket，透過 compose 對 `db` 容器執行 `pg_dump`。

**手動操作**（Makefile 入口）：

```bash
make dev-dump                      # 備份 dev → backups/dev_<時間>.sql.gz
make prod-dump                     # 備份 prod
make dev-restore                   # 還原 dev 同環境最新備份（破壞性，會要求輸入 yes）
make prod-restore FILE=backups/prod_20260622_030000.sql.gz   # 還原指定檔
make dev-restore ANY               # 還原 backups/ 內最新的一份（不分環境）
make stage-restore FILE=backups/prod_xxx.sql.gz YES          # 跨環境遷移、略過確認
```

`restore` 為**直接覆蓋**（DROP + CREATE）：先 `gzip -t` 驗證、踢掉連線、重建 DB，並濾掉 OWNER/GRANT 等帳號綁定語句，使跨環境（含不同 DB 角色）也能還原。預設要求輸入 `yes` 確認，`YES` 旗標可略過（CI/非互動）。

> ⚠️ prod 還原請務必先確認備份來源，並理解這會覆蓋現有資料。建議先 `make prod-dump` 再操作。
