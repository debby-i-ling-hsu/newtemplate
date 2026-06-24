# 架構說明

本文說明這套模板「為什麼這樣設計」，是各子系統的**樞紐頁**：每節末尾連到對應的深度技術參考（「怎麼運作」）。落地規則見 [AGENTS.md](../AGENTS.md) 與 `.claude/skills/`；文件全貌見 [docs/README.md](README.md)。

## 設計目標

1. **穩定性可被保證**：健康檢查、部署閘門、失敗自動回滾、CI/CD，讓「能跑」不靠運氣。
2. **可被 Agent 安全擴充**：結構一致、契約明確，AI 照範例複製就不會破壞系統。
3. **通用**：不綁業務、不含 AI；任何類型網站與 iOS/Android App 都適用。

## 整體拓撲

```
                ┌─────────── 伺服器(VPS) ───────────┐
   使用者 ──TLS──▶  Caddy(反向代理, 不在 repo)  ──▶ web:8000 (Uvicorn/Django)
                │                                   ├─▶ PostgreSQL
                │                                   ├─▶ Redis ──▶ Celery worker × N
                │                                   │              Celery beat
                │                                   └─▶ Azure Blob (media, stage/prod)
                └────────────────────────────────────┘
```

- 前端是 SPA，建置後由 web 服務（WhiteNoise）直送；stage/prod 對外是同一個 URL，`/` 給 Web、`/api/v1/` 給 API、`/admin/` 給後台。dev 同時提供 `http://localhost:3000`（Vite/HMR）與 `http://localhost:8000`（Django 同網域模式，模擬 stage/prod）。
- Mobile 是 Expo React Native App，iOS/Android 透過 `EXPO_PUBLIC_API_BASE_URL` 呼叫同一組 `/api/v1/`。
- 後台是 Django Admin + django-unfold，給非工程師案主/營運使用，不另建一套自製後台。
- Caddy 終結 TLS、處理 HSTS/安全 header、反代到 `web:8000`。它在伺服器上獨立維護，不進本 repo（範例見 `docs/Caddyfile.example`）。

## 環境切分

三套環境共用 `backend/config/settings/base.py`，各自只覆寫差異：

- `dev`：DEBUG、安全性放寬、media 走本地、WhiteNoise 即時讀檔。
- `stage`：類生產，鏡像 prod（含 Azure Blob，但用不同帳號）。
- `prod`：DEBUG 關、HSTS/SSL redirect、嚴格資源上限、DB 備份 sidecar。
- `test`：sqlite in-memory、Celery eager、快速密碼雜湊。

設定一律「有預設值、可被環境變數覆寫」。祕密只放在 `backend/env/.env.<env>`（不進版控），用 `.env.<env>.example` 當範本。

## 後端分層

```
models.py       資料結構（繼承 common.TimeStampedModel）
serializers.py  輸入/輸出形狀與驗證（DRF）
services.py     ★ 商業邏輯（可被 view / Celery / command 重用）
views.py        只處理 HTTP（驗證、權限、回應）
urls.py         路由
```

**後端是單一事實來源**：資料形狀、驗證、權限都在後端決定，前端型別對齊它。資料隔離靠 `request.user` 過濾（見 `items` 範例）。

> → 實作細節（設定分層、common、認證、middleware、錯誤格式）見 [BACKEND.md](BACKEND.md)。

## API 契約

- **版本化**：業務端點掛在 `/api/v1/` 下。要做不相容變更時開 `v2`，舊客戶端可並存不被打斷。
- **OpenAPI schema 為單一來源**：drf-spectacular 自動產生，`/api/schema/`（機器）與 `/api/docs/`（Swagger UI）。前端型別對齊它，避免兩邊各寫一份而漂移。
- **雙 client 同步**：Web (`frontend/`) 與 Mobile (`mobile/`) 都是 `/api/v1/` 的正式客戶端。新增、刪除、修改 API 契約時，除非產品明確限定單一平台，兩邊的 API 型別、hooks、表單 validation、錯誤處理與測試都要同步。
- **統一錯誤格式**：所有 API 錯誤經 `config/exceptions.py` 包成 `{"error": {code, message, detail, request_id}}`，前端只需處理一種形狀，且能用 `request_id` 對照 log / Sentry。
- **list 端點內建分頁 + filter / search / ordering**（`?is_done=&search=&ordering=`，見 `items.views`）。
- **兩層限流**：邊界 IP 限流（DDoS middleware）＋ 應用層 per-user / per-scope（DRF throttle，登入端點收緊）。

> 為什麼這些是預設而非可選：見 [PRINCIPLES.md](PRINCIPLES.md)。並發一致性（原子操作 / idempotency）、N+1、Celery 任務衛生等「上線才會爆」的鐵則都在那份，並有 `items/` 的範本可抄。
>
> → 端點清單見 [API.md](API.md)；錯誤格式 / 限流實作見 [BACKEND.md](BACKEND.md)、[SECURITY.md](SECURITY.md)。

## 前端組織

feature 導向：每個功能一個 `features/<f>/` 資料夾（`api.ts` / `hooks.ts` / `Page` / `Form`）。所有 API 走 `@/lib/api`（axios 實例，自動帶 JWT、401 自動以 refresh token 換發）。資料快取與同步用 React Query；表單用 React Hook Form + Zod。

Vite production build 使用 `/static/` 作為 asset base，Django 透過 `STATICFILES_DIRS` 收集整個 `frontend/dist`，SPA fallback 只負責回 `frontend/dist/index.html`。dev 的 `vite` service 會先 build 一份 `frontend/dist` 給 `http://localhost:8000` 使用，再開 Vite dev server 與 build watch；日常開發用 `:3000` 享受 HMR，需要驗證 stage/prod 同網域行為時用 `:8000`。

> → 實作細節（API client、JWT 自動 refresh、React Query、Vite 設定）見 [FRONTEND.md](FRONTEND.md)。

## 後台組織

後台一律使用 Django Admin，UI theme 使用 `django-unfold`，保留 Django Admin 的權限、ModelAdmin、action、filter、autocomplete 等原生能力，同時提供較現代、RWD 的介面。後台是給非工程師案主操作的管理中心，不是工程師除錯資料表；新增 model 時要同步設計繁體中文的 app 分群、列表欄位、搜尋、篩選、日期導覽、form fieldsets、readonly 系統欄位與必要 actions。

後台標題走 `APP_NAME` / `ADMIN_SITE_TITLE` / `ADMIN_SITE_HEADER`，複製模板後必須改成專案名稱。若需要複雜的前台自助流程，才在 Web/Mobile 做使用者功能；案主/營運後台仍以 Django Admin 為預設。

> → 實作細節（unfold 設定、ModelAdmin 範本、後台 UX 契約）見 [ADMIN.md](ADMIN.md)。

## Mobile 組織

Mobile 位於 `mobile/`，預設使用 Expo managed workflow，目標只包含 iOS/Android；Web 仍由 `frontend/` 負責。每個功能一個 `mobile/src/features/<f>/`，API 走 `mobile/src/lib/api`，JWT 存在 `expo-secure-store`，資料快取與表單規則和 Web 一樣使用 React Query、React Hook Form、Zod。需要原生 SDK 時先升級到 Expo development build；只有 Expo config plugin / development build 無法滿足時才走 Bare React Native。

> → 實作細節（api client、SecureStore tokenStore、feature 切片、EAS Build）見 [MOBILE.md](MOBILE.md)。

## 非同步任務（Celery）

- 三條通用佇列：`default`（一般背景工作）、`maintenance`（清理/排程）、`long_running`（耗時工作）。每條佇列一個獨立 worker，互不搶資源——要加新任務型態時照樣多開一條佇列+worker。
- 可靠性：`task_acks_late` + `task_reject_on_worker_lost`，worker 掛掉任務會重新入隊。`prefetch_multiplier=1` 避免單一 worker 吃太多。
- `beat` 跑 `DatabaseScheduler`，排程存 DB。
- worker 心跳寫進 Redis cache，`/healthz/ready/` 可據此判斷必要 worker 是否在線（`CELERY_REQUIRED_WORKERS`）。

> → 完整設定、log 串接、任務衛生骨架、如何新增佇列見 [CELERY.md](CELERY.md)。

## 健康檢查

- `/healthz/live/`：只回 200，給 Caddy 與 liveness（不碰相依服務，便宜）。
- `/healthz/ready/`：檢查 DB、Redis、queue 長度、必要 worker；任一不健康回 503。compose healthcheck 與 `deploy.sh` 部署閘門都用它。

> → 回傳格式與實作見 [BACKEND.md](BACKEND.md) 的「健康檢查」。

## 儲存策略

| | dev | stage | prod |
|--|--|--|--|
| media（使用者上傳） | 本地檔案系統 | Azure Blob（獨立帳號） | Azure Blob（與 stage 不同帳號） |
| static（CSS/JS/admin） | WhiteNoise | WhiteNoise | WhiteNoise |

stage 鏡像 prod 用雲端儲存，才能在進 prod 前抓出簽名 URL / CORS / content-type / ACL 類問題。`deploy.sh` 會強制 stage/prod 用 Azure、且 prod 與 stage 帳號不同，並實跑 `storage_smoke_test` 確認讀寫真的通。

> 本模板移除了向量資料庫（pgvector）等 AI 專用元件，DB 為純 `postgres:16`。日後若需要向量檢索，換 DB image 為 `pgvector/pgvector:pg16` 並建立 extension 即可。
>
> → storage 後端實作見 [BACKEND.md](BACKEND.md)；儲存閘門與 smoke test 見 [INFRASTRUCTURE.md](INFRASTRUCTURE.md)。

## 部署的穩定性保證（`scripts/deploy.sh`）

依序：**儲存閘門 → 備份 DB → 建置 → migrate → `check --deploy` → 換上新 web → 滾動重啟 worker/beat → `/healthz/ready/` 重試閘門 → storage smoke test**。任一步失敗會**自動把 image 回滾**到前一版，線上維持舊版可用。

> → 逐步拆解、Docker 多階段建置、compose、CD 見 [INFRASTRUCTURE.md](INFRASTRUCTURE.md)；部署操作見 [DEPLOYMENT.md](DEPLOYMENT.md)。

## 可觀測性

結構化 logging 一律寫 **stdout**（12-factor：日誌即事件流，交給 Docker / 收集器，不在容器內寫檔）。重點設計：

- **格式雙軌**：`LOG_FORMAT=console`（本機可讀）/ `json`（stage/prod），預設依環境自動切。
- **關聯 ID 串接**：每筆 log 帶 `request_id`，HTTP 與其觸發的 Celery 任務共用同一個 id，「API 請求 → 背景任務」可串成一條線追蹤。
- **錯誤追蹤**：設 `SENTRY_DSN` 即啟用（Django + Celery integration、不記 PII）；未設則零負擔。

> → 完整欄位、formatter、request_id 串接機制、自訂結構化欄位、延遲監控見 [BACKEND.md](BACKEND.md) 的「可觀測性 / 結構化 Logging」；Celery 端 signal 見 [CELERY.md](CELERY.md)。

## 對照來源

此架構抽取自 Back2Work、TakeMeFly 兩個生產專案的共通骨幹，去除業務/金流/AI 元件，並修正：補上後端 lint/format、只 commit `.env.*.example`、加測試 CI、統一 port(8000) 與 healthz 形狀、worker 改通用佇列名。
