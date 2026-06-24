---
name: deploy-safely
description: 部署到 stage 或 prod，並解讀部署閘門結果。當使用者要上線、部署、發布、或詢問部署流程時使用。實際部署是高風險動作，務必先確認。
---

# 安全部署

部署一律走 `scripts/deploy.sh`（由 `make stage` / `make prod` 呼叫），**不要**手動下個別 docker 指令繞過閘門。

stage/prod 沒有獨立前端服務；Vite production build 會進 Django web image，同一個 Caddy URL 提供 Web SPA、`/api/v1/` 與 `/admin/`。

## 部署前
- 確認 CI（`.github/workflows/ci.yml`）已綠。
- 確認 `backend/env/.env.<env>` 已存在且填好（**不在版控內**）。
- stage/prod 的 `DEFAULT_FILE_STORAGE` 必須是 Azure Blob，且 `AZURE_ACCOUNT_NAME` 已設；prod 帳號不可與 stage 相同（deploy.sh 會擋）。
- **實際部署前先向使用者確認**（這是對外、難復原的動作）。

## 部署
```
make stage   # 或 make prod
```
`deploy.sh` 會依序：儲存閘門 → 備份 DB → 建置 → migrate → `check --deploy` → 滾動重啟 worker → `/healthz/ready/` 重試閘門 → storage smoke test。任一步失敗會**自動把 image 回滾**到前一版。

## 解讀結果
- 成功：最後印出 `deployment 完成。備份：…`。
- 失敗在 `/healthz/ready/`：通常是 db/redis/worker 沒起來——看 `make <env>-logs`、`make <env>-health` 的 checks 欄位哪個不是 `ok`。
- 失敗在 `storage_smoke_test`：Azure 設定或權限問題（帳號、key、container）。
- 失敗會自動回滾，所以線上仍是舊版；修正後重跑即可。

## CD（自動）
push 到 `stage` 分支會自動部署 stage（`.github/workflows/deploy.yml`）；prod 用手動 dispatch。

## 備份 / 還原
- 備份統一走 `scripts/db.sh`：部署前自動備份，stage/prod 另有每日 `db-backup` 排程 sidecar，檔名 `backups/<env>_<時間>.sql.gz`（不進版控）。
- 手動備份：`make <env>-dump`（安全，可直接執行）。
- **還原是破壞性操作**（DROP+CREATE 覆蓋整個 DB）：`make <env>-restore [FILE=… | ANY] [YES]`。執行前**務必先向使用者確認**，settings.json 已將 `*-restore` 設為需確認。建議還原前先 `make <env>-dump`。
- 跨環境遷移（如把 prod 資料灌進 stage）：`make stage-restore FILE=backups/prod_xxx.sql.gz`。
