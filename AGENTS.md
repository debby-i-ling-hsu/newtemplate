# AGENTS.md — 工程契約（給所有 AI Agent 與工程師）

> 這份文件是**規範來源（normative）**。Claude、Codex、Cursor 等任何 agent 在本 repo 工作前都要先讀它，並嚴格遵守。CLAUDE.md 只是指向這裡。
>
> **規範 vs 說明**：本檔與 `docs/PRINCIPLES.md` 是規範（「你必須怎麼做」，衝突時以此為準）；`docs/` 其餘文件是說明（informative，「系統實際怎麼運作」），協助理解、不可與規範牴觸。若發現說明文件與規範或程式碼牴觸，以規範為準並回報。完整索引見 `docs/README.md`（文件地圖）。

## 這是什麼

一個生產級的通用 Web + Mobile App 模板：你照著既有結構長出新功能，就能得到和 Back2Work / TakeMeFly 同級的基礎設施、技術棧與目錄架構，並由內建的健康檢查、部署閘門、CI/CD 保證穩定性。**它通用於任何類型的網站與 iOS/Android App，不綁特定業務、也不含 AI 功能。**

## 技術棧（不要擅自更換）

- 後端：Django 5 + Django REST Framework + Uvicorn(ASGI)；PostgreSQL 16；Redis 7；Celery worker + beat。
- 後台：Django Admin + django-unfold；給非工程師案主使用，介面以繁體中文、RWD、清楚分群與可操作性為預設。
- 前端：React 18 + Vite + TypeScript + Tailwind + React Query + React Hook Form + Zod。
- Mobile：Expo + React Native + TypeScript + React Query + React Hook Form + Zod；iOS/Android 雙系統，預設不使用 Bare React Native。
- 基礎設施：多階段 Docker、`docker-compose`（dev/stage/prod）、`Makefile` 統一入口、`scripts/deploy.sh` 安全部署、伺服器上 Caddy 反向代理（不在本 repo）。

## 目錄分層

```
backend/
  config/        # 設定(settings 分層)、urls、middleware、celery、健康檢查
  common/        # 共用：base model、儲存後端、healthz、smoke test
  accounts/      # 使用者與 JWT 認證
  items/         # ★ 範例功能(垂直切片)，新功能照它複製
  <feature>/     # 你的新功能：一個垂直功能一個 app
frontend/
  src/
    lib/         # api client(axios+JWT)、queryClient、utils
    components/   # 共用 UI
    features/<f>/ # ★ 一個功能一個資料夾：api/hooks/Page/Form
mobile/
  src/
    lib/           # api client(axios+JWT)、SecureStore tokenStore、queryClient、config
    components/    # React Native 共用 UI
    features/<f>/  # ★ 一個功能一個資料夾：api/hooks/Screen/Form
```

## 核心原則

1. **後端是單一事實來源**：資料形狀、驗證、權限以後端為準；前端型別對齊後端 serializer。
2. **分層**：`models → serializers → services → views`。商業邏輯放 `services.py`，view 只處理 HTTP。
3. **前端 feature 導向**：每個功能自成一個 `features/<f>/` 資料夾，API 一律經 `@/lib/api`。
4. **Mobile feature 導向**：每個功能自成一個 `mobile/src/features/<f>/` 資料夾，API 一律經 `mobile/src/lib/api`，token 一律放 `expo-secure-store`。
5. **Web/Mobile 介面同步**：任何功能新增、刪除、欄位修改、API 契約修改、權限/狀態流程修改，都要同時檢查 `frontend/` 與 `mobile/` 是否需要同步。除非使用者明確說「只改 web」或「只改 mobile」，預設兩邊都要完成到可用狀態。
6. **後台一律 Django Admin**：案主/營運用的後台管理一律建在 Django Admin，不另做自製 React 後台，除非使用者明確要求前台自助式管理流程。Admin UI 使用 `django-unfold`，標題走 `APP_NAME` / `ADMIN_SITE_*`，主要文案與分群用繁體中文。
7. **Web 入口一致**：stage/prod 由 Django web 服務同網域提供 Web SPA、`/api/v1/` 與 `/admin/`；dev 必須同時保留 Vite `:3000`（HMR）與 Django `:8000`（同網域模式）。Vite production build 的 asset base 是 `/static/`，不要改回 `/assets/`。
8. **資料隔離**：屬於使用者的資料一定用 `request.user` 過濾，避免越權（範例見 `items`）。Web/Mobile UI 不決定 owner/role/price 等權威欄位。
9. **設定全走環境變數**：程式碼不寫死祕密；新增設定要有預設值且可被 env 覆寫。Mobile API base URL 走 `EXPO_PUBLIC_API_BASE_URL`。
10. **功能規格書同步**：本專案「目前提供哪些功能、怎麼運作」以 `docs/SPEC.md` 為單一事實來源。任何使用者可見功能的新增 / 修改 / 刪除都要在同一次變更更新 SPEC；使用者轉述案主新需求時也要主動先更新 SPEC。詳見「功能規格書」一節。

## 生產鐵則（「能跑」不等於「能上線」）

> VibeCoding 最大的坑是只想到 happy path，沒想到並發、重試、資安、維護。**每加一個功能，照 [`docs/PRINCIPLES.md`](docs/PRINCIPLES.md) 的清單逐條檢查。** 摘要：

- **並發安全**：讀-改-寫（庫存/餘額/狀態）一律 `transaction.atomic()` + `select_for_update()`，數值增減用 `F()`。範本：`items/services.py` 的 `complete_item()`。
- **可重試（idempotent）**：使用者會雙擊、客戶端會重送、Celery 會重跑——同一操作跑兩次必須安全；扣款/建立型操作用 `Idempotency-Key` 去重。
- **效能**：list 端點防 N+1（`select_related`/`prefetch_related`）、一律分頁、filter 欄位加索引。
- **背景任務**：>1 秒或打外部 I/O 的工作丟 Celery，傳 ID 不傳物件、idempotent、設重試與 `soft_time_limit`。範本：`items/tasks.py`。何時加新佇列：出現隊頭阻塞或需獨立擴縮時才拆，別過早拆。
- **資安**：權威欄位（owner/price/role）一律後端決定，不信任前端；認證端點限流；log 不記 PII。
- **可演進**：API 版本化（`/api/v1/`）、統一錯誤格式、migration 用 expand/contract（可空→回填→加約束），不可在一次部署做破壞性變更。

## 怎麼加一個功能（標準流程）

- 後端：照 `backend/items/` 複製 → 註冊到 `LOCAL_APPS` → 掛 `config/urls.py` → `make dev-makemigrations` → 寫測試。詳見 skill `add-backend-feature`。
- 前端：照 `frontend/src/features/items/` 複製 → 在 `App.tsx` 加路由（需登入用 `<RequireAuth>`）→ 寫測試（MSW）。詳見 skill `add-frontend-page`。
- Mobile：照 `mobile/src/features/items/` 複製 → API 走 `mobile/src/lib/api` → 畫面放 `Screen/Form` → 寫 Jest + React Native Testing Library 測試。詳見 skill `add-mobile-feature`。
- 規格：動工前先讀 `docs/SPEC.md` 對焦既有行為；完工後把這次新增/修改/刪除的功能與變更歷史寫回 `docs/SPEC.md`。

## 功能變更的跨介面契約

Agent 在「新增 / 刪除 / 修改」任何使用者可見功能時，必須先判斷影響面，並在回報中說清楚 Web 與 Mobile 的處理結果：

- 新增功能：若後端新增 API 或資料模型，預設同時新增 `frontend/src/features/<f>/` 與 `mobile/src/features/<f>/` 的可用介面、表單、列表與測試。
- 修改功能：若 serializer 欄位、API path、狀態機、權限、錯誤格式或 validation 有變，必須同步更新 Web API 型別/hooks/畫面，以及 Mobile API 型別/hooks/screen/form。
- 刪除功能：刪後端 API 或資料欄位時，必須同步移除 Web 路由、導覽、測試 mock，以及 Mobile 入口、screen/form、測試，避免留下死連結或呼叫不存在的 endpoint。
- 只改單一介面：只有使用者明確限定「只改 web」或「只改 mobile」時才可不改另一邊；回報時仍要標明另一邊未改，以及未改的原因。
- 驗證：同時影響 Web/Mobile 時，必須跑前端檢查與 `make mobile-check`；若也動到後端，還要跑後端檢查/測試。

## 功能規格書（`docs/SPEC.md`）— 隨功能同步維護的單一事實來源

`docs/SPEC.md` 用非工程師也讀得懂的方式，記錄本專案**目前實際提供哪些使用者可見功能、每個功能怎麼運作**。它是與程式碼一起維護的活文件，目的有三：

1. **防 VibeCoding 改壞**：動工前先讀 SPEC，掌握既有行為與邊界，才不會改 A 功能把 B 功能弄掛。
2. **改壞好追蹤**：每次功能變更都在 SPEC 留紀錄，出問題時能對照「本來應該長怎樣」回推哪裡退化。
3. **好跟案主說明**：SPEC 是非工程師看得懂的功能清單，可直接拿來對焦需求、驗收與報價。

規則（強制）：

- **功能改了就要同一次改 SPEC**：任何使用者可見功能的新增 / 修改 / 刪除——含資料模型、API 契約、畫面/表單、權限、狀態流程、驗收標準——都要在同一次變更更新 `docs/SPEC.md`。功能改了但 SPEC 沒更新 = 這次變更未完成。
- **案主新需求要主動更新**：當使用者轉述「案主/客戶那邊有新要求或要修改」時，即使還沒開始寫程式，也要先把該需求反映進 `docs/SPEC.md`（在對應功能標 `狀態：待實作`），讓規格永遠是最新的對焦點，再進入實作。
- **每筆變更寫進變更歷史**：在 SPEC 末的變更歷史表新增一列（日期、變更內容、對應功能、原因/來源、狀態）。
- **牴觸處理**：SPEC 與程式碼實際行為牴觸時，以程式碼為準並立即修正 SPEC；SPEC 與案主新需求牴觸時，先更新 SPEC 再改碼。
- **規範地位**：SPEC 描述「系統現在做什麼」，AGENTS.md / `docs/PRINCIPLES.md` 規範「你必須怎麼做」；工程規則衝突時仍以 AGENTS.md / PRINCIPLES.md 為準。

## 後台 UX 契約

後台的使用者是非工程師案主，不是開發者。新增或修改任何需要營運管理的 model 時，必須同步完成 Django Admin：

- Admin class 一律繼承 `unfold.admin.ModelAdmin`，不要退回原生 `admin.ModelAdmin`。
- app 分群、model 顯示、fieldsets、actions、help text、錯誤提示與重要欄位標題以繁體中文為主。
- list 頁要能讓案主快速找到資料：設定 `list_display`、`search_fields`、`list_filter`、`date_hierarchy`、合理 `list_per_page`；關聯欄位資料量會長大時用 `autocomplete_fields`。
- change form 要按案主工作流程分區，不要把資料庫欄位原樣堆出來；系統欄位如 `owner`、時間戳、狀態歷史要清楚標示，該 readonly 就 readonly。
- 後台必須 RWD 可用；不要引入破壞 Unfold 響應式版面的客製 CSS/JS。
- 專案複製後要改 `APP_NAME` / `ADMIN_SITE_TITLE` / `ADMIN_SITE_HEADER`，讓後台標題是專案名稱，不留下模板名。

## 改完一定要跑的最小驗證

- 後端有改：`make backend-check && make backend-test`
- 前端有改：`npm --prefix frontend run lint && npm --prefix frontend run test && npm --prefix frontend run build`，且需要確認 production build 仍從 `/static/assets/...` 載入。
- Mobile 有改：`npm --prefix mobile run lint && npm --prefix mobile run typecheck && npm --prefix mobile run test`
- 系統有改（compose/Dockerfile/設定）：`make dev` 後 `make dev-health` 要綠燈、`docker compose ... ps` 服務全 healthy。
- 功能有改：`docs/SPEC.md` 是否已同步該功能的最新行為，並在變更歷史補上這次的紀錄。

**healthz 不是綠燈、測試沒過，就不算完成。** 回報時據實以告，不要宣稱通過。

## 嚴禁

- ❌ commit 任何 `backend/env/.env.dev|stage|prod|local`（只有 `.example` 進版控）。
- ❌ commit `backups/` 內的備份檔（`*.sql` / `*.sql.gz`，可能含正式資料）。
- ❌ 手寫或手改 migration 檔（一律用 `makemigrations` 產生）。
- ❌ 繞過 `scripts/deploy.sh` 直接部署，或在閘門失敗時硬上。
- ❌ 在 view/serializer 裡塞商業邏輯；在前端組件裡直接 `fetch`/`axios`。
- ❌ 在 mobile screen/component 裡直接 `fetch`/`axios`，或把 JWT 存到 AsyncStorage / 明文檔案。
- ❌ 改了使用者可見功能（model / API / 畫面 / 權限 / 狀態流），卻沒在同一次變更更新 `docs/SPEC.md`。
- ❌ 未經確認就執行 `*-restore` 或其他對外、難復原的動作（部署、刪/覆蓋資料）。

## 部署

`make stage` / `make prod` → `scripts/deploy.sh`：儲存閘門 → 備份 → migrate → `check --deploy` → 滾動重啟 → `/healthz/ready/` 重試閘門 → storage smoke test → 失敗自動回滾。stage/prod 的 Web SPA、API、Admin 都由同一個 Django/Caddy URL 對外；media 一律 Azure Blob（不同帳號）；static 三環境都 WhiteNoise。詳見 `docs/DEPLOYMENT.md` 與 skill `deploy-safely`。

## 備份 / 還原

統一走 `scripts/db.sh`（dev/stage/prod 共用），CLI 與排程 sidecar 都用它，命名一致 `backups/<env>_<時間>.sql.gz`：

- 備份：`make <env>-dump`（部署前自動備份；stage/prod 另有每日 `db-backup` 排程 sidecar）。
- 還原（**破壞性**，DROP+CREATE，預設要求確認）：`make <env>-restore [FILE=… | ANY] [YES]`。
- 跨環境遷移：`make stage-restore FILE=backups/prod_xxx.sql.gz`（會自動濾掉帳號綁定語句）。

詳見 `docs/DEPLOYMENT.md`。

## 更多文件

完整索引與「規範 vs 說明」分層見 **`docs/README.md`（文件地圖）**。重點：

- 規範：`docs/PRINCIPLES.md`（生產鐵則 + 落地檢查清單，每加功能必讀）。
- 入門：`docs/DEVELOPMENT.md`（工具鏈 / 指令 / CI）、`docs/ARCHITECTURE.md`（設計理由）、`CONTRIBUTING.md`（分支 / PR）。
- 深度參考：`docs/{BACKEND,CELERY,FRONTEND,MOBILE,INFRASTRUCTURE,ADMIN,SECURITY}.md`。
- 參考資料：`docs/{ENVIRONMENT,API,TESTING,DEPLOYMENT}.md`。
- 非工程師：`docs/PM_GUIDE.md`。
