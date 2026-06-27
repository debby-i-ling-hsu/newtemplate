# 開發指南（給工程師）

本文是工程師在本機開發本 repo 的完整參考：環境需求、目錄分層、**程式碼風格與 Lint/Format/Typecheck 工具鏈**、所有 `make` 指令、pre-commit、CI 對照。
「為什麼這樣設計」見 [ARCHITECTURE.md](ARCHITECTURE.md)；「上線鐵則」見 [PRINCIPLES.md](PRINCIPLES.md)；環境變數見 [ENVIRONMENT.md](ENVIRONMENT.md)；測試見 [TESTING.md](TESTING.md)。

---

## 1. 環境需求

| 工具 | 版本 | 用途 |
|------|------|------|
| Docker Desktop | 最新 | 跑整套 dev 環境（`make dev`），唯一硬需求 |
| Python | 3.12 | 後端本機 venv（lint/format/test 與 CI 一致） |
| Node.js | 20 | 前端 / Mobile（lint/test/build，與 CI 一致） |
| `pre-commit` | 最新 | commit 前自動跑 ruff/black（選用但建議） |

> 只用 `make dev` 起站的話只需要 Docker。但要在**本機**跑後端 lint/format/test（不進容器），需要 Python 3.12 並執行 `make backend-venv`。

---

## 2. 第一次設定

```bash
# 1) 起整套 dev 環境（自動把 .env.dev.example 複製成 .env.dev）
make dev
make dev-health                 # 應回 {"status":"ok", ...}

# 2) 後端本機 venv（lint/format/test 用，與 CI 同版本）
make backend-venv               # 建 backend/.venv 並裝 requirements-dev.txt

# 3) 前端 / Mobile 依賴
make frontend-install
make mobile-install

# 4) （建議）裝 pre-commit hook
pipx install pre-commit         # 或 pip install pre-commit
pre-commit install
```

開發入口：

| URL | 用途 |
|-----|------|
| http://localhost:3000 | Vite 前端（HMR 開發入口） |
| http://localhost:8000/ | Django 同網域入口（模擬 stage/prod，Web SPA + API + Admin） |
| http://localhost:8000/admin/ | Django Admin 後台 |
| http://localhost:8000/api/docs/ | Swagger UI（OpenAPI 互動文件） |
| http://localhost:8000/api/schema/ | OpenAPI schema（機器可讀，前端型別來源） |

---

## 3. 目錄分層

```
backend/
  config/
    settings/      base.py + dev/stage/prod/test.py（分層覆寫）
    urls.py        路由（admin / healthz / api/schema / api/v1 / SPA fallback）
    celery.py      Celery app、request_id 串接 signal
    middleware.py  RequestID / 安全 header / DDoS 限流 / 延遲監控
    exceptions.py  統一錯誤格式 {"error": {code, message, detail, request_id}}
    logging_utils.py  結構化 logging（console / json）
  common/          base model、權限(IsOwner)、storage、healthz view、SPA view、smoke test
  accounts/        使用者 + JWT 認證（register/login/token-refresh/me）
  items/           ★ 範例垂直切片（model→serializer→service→view + tasks + tests）
  <feature>/       你的新功能：一個垂直功能一個 app
frontend/src/
  lib/             api(axios+JWT 自動 refresh)、queryClient、tokens、utils
  config/          前端設定
  components/ui/    共用 UI（button/input…）
  features/<f>/     ★ 一個功能一個資料夾：api.ts / hooks.ts / Page / Form
  mocks/           MSW handlers/server（測試用）
  test-utils.tsx   測試 render helper
mobile/src/
  lib/             api、config、queryClient、tokens(SecureStore)
  components/       React Native 共用 UI
  features/<f>/     ★ 一個功能一個資料夾：api.ts / hooks.ts / Screen / Form
  types/           型別宣告（env.d.ts…）
```

詳細加功能流程見 [AGENTS.md](../AGENTS.md) 與 `.claude/skills/`。

---

## 4. 程式碼風格與工具鏈

三端各有 linter/formatter/typechecker，**全部會在 CI 擋**。本機請用對應的 `make` 指令在 commit 前跑過。

### 4.1 後端 — Ruff + Black（Python）

設定在 [backend/pyproject.toml](../backend/pyproject.toml)。

| 項目 | 值 |
|------|----|
| Formatter | **Black**（`line-length = 100`、`target-version = py312`、排除 `migrations/`） |
| Linter | **Ruff**（`line-length = 100`、`target-version = py312`、排除 `migrations/`） |
| Ruff 規則集 | `E`/`F`（pycodestyle + pyflakes）、`I`（isort import 排序）、`UP`（pyupgrade）、`B`（flake8-bugbear）、`DJ`（flake8-django） |
| Ruff ignore | `E501`（行長交給 Black 管） |
| Per-file ignore | `**/settings/*.py` 允許 `F403`/`F405`（settings 分層 star-import 覆寫） |

指令：

```bash
make backend-check   # ruff check . + black --check . + manage.py check（= CI）
make backend-fmt     # ruff check --fix . + black .（自動修正）
```

> Import 排序由 Ruff 的 `I` 規則負責，不要另外裝 isort。行長一律 100；超過時讓 Black 自己折，不要手動 ignore。

### 4.2 前端 — ESLint + TypeScript（Web）

設定在 [frontend/eslint.config.js](../frontend/eslint.config.js)（ESLint flat config）。

- base：`@eslint/js` recommended + `typescript-eslint` recommended。
- plugin：`react-hooks`（recommended 規則）、`react-refresh`（`only-export-components` warn）。
- 自訂：`@typescript-eslint/no-unused-vars` warn，`_` 前綴的參數忽略。
- 忽略：`dist`、`node_modules`。
- 型別檢查：`tsc -b`(`tsconfig.app.json` / `tsconfig.node.json`)，跑在 `npm run build` 內。

指令：

```bash
make frontend-lint    # eslint .
make frontend-build   # tsc -b && vite build（含型別檢查）
make frontend-test    # vitest run
```

> 前端的 typecheck 內建在 build（`tsc -b`）。Vite production build 的 asset base 是 `/static/`，不要改回 `/assets/`。

### 4.3 Mobile — ESLint + TypeScript（Expo React Native）

設定在 [mobile/eslint.config.js](../mobile/eslint.config.js)。

- base：`@eslint/js` recommended + `typescript-eslint` recommended。
- plugin：`react-hooks`（recommended 規則）。
- 自訂：`@typescript-eslint/no-unused-vars` warn，`_` 前綴忽略；test 檔加 jest globals。
- 忽略：`node_modules`、`.expo`、`coverage`、`dist`、`eslint.config.js`。
- 型別檢查：獨立的 `tsc --noEmit`（不像 Web 綁在 build）。

指令：

```bash
make mobile-lint        # eslint .
make mobile-typecheck   # tsc --noEmit
make mobile-test        # jest --runInBand
make mobile-check       # 上面三者一起跑（= CI 的 mobile job）
```

### 4.4 編輯器一致性 — EditorConfig

[.editorconfig](../.editorconfig) 統一所有編輯器的縮排與換行：

| 檔案 | 縮排 | 其他 |
|------|------|------|
| 全部 | — | UTF-8、LF、檔尾換行、去尾端空白 |
| `*.py` | 4 spaces | |
| `*.{ts,tsx,js,jsx,json,css,html,yml,yaml}` | 2 spaces | |
| `Makefile` | tab | |
| `*.sh` | 4 spaces | |

主流編輯器（VS Code、JetBrains）內建或裝個 EditorConfig plugin 即自動套用。

### 4.5 Pre-commit

[.pre-commit-config.yaml](../.pre-commit-config.yaml) 在每次 commit 前對 `backend/` 自動跑：

- **ruff**（`--fix`，自動修正）
- **black**
- 通用 hook：trailing-whitespace、end-of-file-fixer、check-yaml、check-added-large-files、detect-private-key

安裝與手動全跑：

```bash
pipx install pre-commit && pre-commit install   # 一次性安裝 hook
pre-commit run --all-files                       # 手動對全 repo 跑
```

> pre-commit 只涵蓋後端 Python 格式與基本安全檢查（防止誤 commit 私鑰 / 大檔）。前端 / Mobile 的 lint 不在 pre-commit，請靠 `make check` 與 CI。

---

## 5. 全部 `make` 指令

`make help` 會列出所有指令。完整對照：

### 本機開發

| 指令 | 說明 |
|------|------|
| `make dev` | 啟動 dev 環境（Vite :3000、Django :8000）；自動建 `.env.dev` |
| `make dev-down` | 停止 dev |
| `make dev-restart` | 重啟 dev 服務 |
| `make dev-reset` | 砍掉並重建（**清除 db/redis volume**） |
| `make dev-logs` | 追全部 log |
| `make dev-logs-service SERVICE=web` | 追單一服務 log |
| `make dev-errors` | 追本機保留的 warning/error log |
| `make dev-errors-service SERVICE=web` | 追本機單一服務 warning/error log |
| `make dev-errors-grep Q=keyword` | 搜尋本機保留的 warning/error log |
| `make dev-shell` | 進 web 容器 bash |
| `make dev-superuser` | 建 Django 管理員帳號 |
| `make dev-makemigrations` | 改 model 後產生 migration |
| `make dev-health` | 打 `/healthz/ready/` |

### 檢查（與 CI 一致）

| 指令 | 說明 |
|------|------|
| `make backend-venv` | 建 `backend/.venv` 並裝 dev 依賴 |
| `make backend-check` | ruff + black --check + django check |
| `make backend-fmt` | 自動修正 ruff + black |
| `make backend-test` | 後端測試（sqlite in-memory） |
| `make frontend-install` / `frontend-lint` / `frontend-test` / `frontend-build` | 前端依賴 / lint / test / build |
| `make mobile-install` / `mobile-start` / `mobile-ios` / `mobile-android` | mobile 依賴 / Expo / iOS / Android |
| `make mobile-lint` / `mobile-typecheck` / `mobile-test` / `mobile-check` | mobile lint / typecheck / test / 三合一 |
| `make check` | **跑所有檢查（= CI）**：backend-check + backend-test + frontend(lint/test/build) + mobile-check |

### 部署與資料

| 指令 | 說明 |
|------|------|
| `make stage` / `make prod` | 安全部署（`scripts/deploy.sh`，含閘門與自動回滾） |
| `make stage-down` / `prod-down` | 停止 stage / prod |
| `make stage-logs` / `prod-logs` | 追 stage / prod Docker log stream |
| `make stage-logs-service SERVICE=web` / `prod-logs-service SERVICE=web` | 追單一服務 Docker log stream |
| `make stage-errors` / `prod-errors` | 追 stage / prod 保留的 warning/error log |
| `make stage-errors-service SERVICE=web` / `prod-errors-service SERVICE=web` | 追單一服務 warning/error log |
| `make stage-errors-grep Q=keyword` / `prod-errors-grep Q=keyword` | 搜尋保留的 warning/error log |
| `make stage-shell` / `prod-shell` | 進 stage / prod web 容器 shell |
| `make stage-superuser` / `prod-superuser` | 建 stage / prod Django 管理員帳號 |
| `make stage-health` / `prod-health` | 打 stage / prod `/healthz/ready/` |
| `make <env>-dump` | 備份 DB → `backups/<env>_<時間>.sql.gz` |
| `make <env>-restore [FILE=… \| ANY] [YES]` | 還原 DB（**破壞性**，DROP+CREATE） |

備份 / 還原細節見 [DEPLOYMENT.md](DEPLOYMENT.md)。

---

## 6. 改完一定要跑的最小驗證

| 改了什麼 | 跑什麼 |
|----------|--------|
| 後端 | `make backend-check && make backend-test` |
| 前端 | `make frontend-lint && make frontend-test && make frontend-build`（確認 build 仍從 `/static/assets/...` 載入） |
| Mobile | `make mobile-check` |
| 系統（compose/Dockerfile/設定） | `make dev` 後 `make dev-health` 綠燈、`docker compose ... ps` 全 healthy |
| 全部 | `make check` |

> **healthz 不是綠燈、測試沒過，就不算完成。** 回報時據實以告。

---

## 7. CI 對照

[.github/workflows/ci.yml](../.github/workflows/ci.yml) 在 PR 與 push 到 `stage`/`prod` 時跑三條並行 job，與本機指令一一對應：

| CI job | 步驟 | 本機等價 |
|--------|------|----------|
| **backend** (Python 3.12) | `ruff check .` → `black --check .` → `manage.py check` → `manage.py test` | `make backend-check && make backend-test` |
| **frontend** (Node 20) | `npm ci` → `npm run lint` → `npm run test` → `npm run build` | `make frontend-lint && make frontend-test && make frontend-build` |
| **mobile** (Node 20) | `npm ci` → `npm run lint` → `npm run typecheck` → `npm run test` | `make mobile-check` |

後端測試用 `DJANGO_SETTINGS_MODULE=config.settings.test`（sqlite in-memory、Celery eager、快速密碼雜湊）。

CD（部署）見 [DEPLOYMENT.md](DEPLOYMENT.md)。

---

## 8. 常見開發情境

| 想做的事 | 怎麼做 |
|----------|--------|
| 加後端功能 | 照 `backend/items/` 複製 → 註冊 `LOCAL_APPS` → 掛 `config/urls.py` → `make dev-makemigrations` → 寫測試。skill `add-backend-feature` |
| 加前端頁面 | 照 `frontend/src/features/items/` 複製 → `App.tsx` 加路由（需登入包 `<RequireAuth>`）→ MSW 測試。skill `add-frontend-page` |
| 加 Mobile 功能 | 照 `mobile/src/features/items/` 複製 → API 走 `mobile/src/lib/api` → Jest + RNTL 測試。skill `add-mobile-feature` |
| 改 model 後 migration | `make dev-makemigrations`（**不要手寫/手改 migration**） |
| 看 API 文件 | http://localhost:8000/api/docs/ |
| 排查紅燈 / 起不來 | skill `troubleshoot` |
</content>
</invoke>
