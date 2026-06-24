---
name: run-checks
description: 改完程式碼後必跑的最小驗證。當完成任何後端或前端改動、要確認沒弄壞東西、或使用者說「檢查/測試一下」時使用。
---

# 改完一定要跑的檢查

任何改動完成後，**至少**跑對應這側的檢查，全綠才算完成。

若變更是使用者可見功能、API 契約、serializer 欄位、權限、狀態流程或 validation，除非使用者明確限定只改單一介面，必須同時檢查 Web (`frontend/`) 與 Mobile (`mobile/`) 是否已同步，並跑兩邊檢查。

## 後端（改了 `backend/` 時）
```
make backend-check     # ruff + black --check + django check + 產生缺漏的 migration 提示
make backend-test      # python manage.py test
```
或在 web 容器內：`docker compose -f docker-compose.dev.yml exec web python manage.py test`

若改了 model：先 `make dev-makemigrations`，確認有產生 migration 並進版控。

## 前端（改了 `frontend/` 時）
```
npm --prefix frontend run lint
npm --prefix frontend run test
npm --prefix frontend run build
```
確認 `frontend/dist/index.html` 的 JS/CSS 走 `/static/assets/...`，因為 stage/prod 與 dev 的 Django `:8000` 都靠 Django/WhiteNoise 提供 production build。

## Mobile（改了 `mobile/` 時）
```
npm --prefix mobile run lint
npm --prefix mobile run typecheck
npm --prefix mobile run test
```

## 系統整體（改了 compose / Dockerfile / 設定時）
```
make dev            # 起整個 stack
make dev-health     # /healthz/ready/ 要回 200 且 checks 全 ok
docker compose -f docker-compose.dev.yml ps   # 服務都要 healthy
```
若改到 Web serving、Vite、Dockerfile 或 static 設定，還要確認 `http://localhost:3000/`（Vite/HMR）與 `http://localhost:8000/`（Django 同網域）都能訪問 Web。

## 回報
- 把實際指令輸出講清楚；測試有失敗就貼出失敗內容，不要宣稱通過。
- healthz 不是綠燈就不算完成。
- 若只改 Web 或只改 Mobile，要說明是使用者明確限定，或另一個介面無需同步的具體原因。
