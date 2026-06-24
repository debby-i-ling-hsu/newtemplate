---
name: troubleshoot
description: 排查本機或部署的常見問題：healthz 紅燈、容器起不來、migration 衝突、前端連不到後端。當使用者說「壞了/起不來/連不上/紅燈/錯誤」時使用。
---

# 疑難排解

先定位是哪一層，再對症處理。

## healthz 紅燈（/healthz/ready/ 非 200）
看回傳 JSON 的 `checks`：
- `db: fail` → db 容器沒 healthy 或 `DATABASE_URL` 錯。`docker compose ... ps`、`... logs db`。
- `redis: fail` → redis 沒起來或 `CELERY_BROKER_URL` 錯。
- `workers: missing=...` → 對應 worker 沒起來。`make dev-logs-service SERVICE=worker-default`；或 `CELERY_REQUIRED_WORKERS` 設了不存在的 worker。

## 容器起不來 / 一直 restart
```
docker compose -f docker-compose.dev.yml ps
docker compose -f docker-compose.dev.yml logs <service>
```
常見：`.env.dev` 不存在（要先 `cp backend/env/.env.dev.example backend/env/.env.dev`）；port 8000/3000 被佔用；migration 失敗（看 web log）。

## migration 衝突
- 缺 migration：`make dev-makemigrations` 後重跑 `make dev`。
- 衝突（多人各自產生）：刪掉未合併的本地 migration、重新 `makemigrations`；**不要**手改既有 migration 檔。
- 想從頭來：`make dev-reset`（會清掉 dev 資料庫 volume）。

## 前端連不到後端
- dev 前端在 `:3000`，API 經 vite proxy 轉到 `web:8000`（見 `frontend/vite.config.ts`）。
- dev 的 Django 同網域入口在 `:8000`；它讀 `frontend/dist/index.html`，JS/CSS 應該從 `/static/assets/...` 載入。
- 如果 `:8000` 首頁顯示 frontend not built，等 `vite` service 跑完第一次 build，或看 `docker compose -f docker-compose.dev.yml logs vite`。
- 如果 `:8000` 首頁有 HTML 但畫面空白，先檢查瀏覽器 Network 是否有 `/static/assets/...` 404。
- 確認 web 容器 healthy；瀏覽器 Network 看 `/api/...` 回應碼。
- 401 是正常的「未登入」——先到 `/login` 登入或 `/register` 註冊。

## 最後手段
`make dev-reset` 重建整個 dev 環境（清 volume）。回報時把實際 log 貼出來。
