# fullstack-app-template

生產級的**通用 Web + Mobile App 模板**：一條指令起站，照範例長功能，就能得到與正式產品同級的基礎設施、技術棧與目錄架構，並由內建的健康檢查、部署閘門與 CI/CD 保證穩定性。

適用於**任何類型的網站與 iOS/Android App**（不綁特定業務、不含 AI 功能）。設計成讓**非工程師 PM 也能用 AI Agent（Claude / Codex / Cursor 等）VibeCoding** 做出穩定系統。

---

## 技術棧

| 層 | 選用 |
|----|------|
| 後端 | Django 5 · DRF · Uvicorn(ASGI) |
| 後台 | Django Admin · django-unfold · 繁體中文 · RWD |
| 資料 | PostgreSQL 16 · Redis 7 · Celery(worker + beat) |
| 前端 | React 18 · Vite · TypeScript · Tailwind · React Query · React Hook Form · Zod |
| Mobile | Expo · React Native · TypeScript · React Query · React Hook Form · Zod |
| 基礎設施 | 多階段 Docker · docker-compose(dev/stage/prod) · Makefile · 安全部署腳本 · 伺服器端 Caddy 反代 |

## 5 分鐘上手

需求：Docker Desktop。

```bash
# 1) 起整個環境（會自動建立 .env.dev）
make dev

# 2) 開瀏覽器
#    Vite 前端 http://localhost:3000   （HMR 開發入口，先到 /register 註冊）
#    Django 同網域入口 http://localhost:8000/   （模擬 stage/prod）
#    後台 Admin http://localhost:8000/admin/

# 3) 確認系統健康
make dev-health        # 應回 {"status":"ok", ...}
```

打開後可以註冊、登入、對「我的清單」做新增/完成/刪除——這就是內建的範例垂直切片（`accounts` + `items`）。

> 非工程師請改看 **[docs/PM_GUIDE.md](docs/PM_GUIDE.md)**：用一句話請 Agent 幫你加功能的劇本。

## 用 Agent 加功能

這個 repo 為 AI Agent 準備好了環境：

- **[AGENTS.md](AGENTS.md)** — 所有 agent 都讀的工程契約（唯一事實來源）。
- **[.agents/](.agents/)** — Claude / Codex / Cursor 共用的 canonical skill 目錄。
- **[CLAUDE.md](CLAUDE.md)** 與 **`.claude/`** — Claude Code 專屬入口與 adapter。
- **`.cursor/rules/`** — Cursor always-apply rules，指回 AGENTS 與 `.agents/skills/`。

對 Agent 說「幫我加一個 X 功能」，它就會照 `items` 範例與 skill 落地，並跑必要檢查。

## 常用指令

```bash
make help          # 列出所有指令
make dev           # 起本機環境（Vite :3000 + Django 同網域 :8000）
make dev-reset     # 重建（清資料）
make check         # 跑所有檢查（= CI）
make mobile-start  # 啟動 Expo dev server
make mobile-check  # Mobile lint + typecheck + test
make dev-makemigrations
make stage         # 安全部署 stage
make prod          # 安全部署 prod
```

## 專案結構

```
backend/   Django 後端（config 設定 / common 共用 / accounts 認證 / items 範例）
           後台一律使用 Django Admin + django-unfold
frontend/  React Web 前端（lib / components / features）
mobile/    Expo React Native App（lib / components / features）
dockerfiles/  多階段 Dockerfile
docker-compose.{dev,stage,prod}.yml
scripts/deploy.sh  安全部署（備份→migrate→健康閘門→失敗自動回滾）
.github/workflows/ ci.yml(CI) + deploy.yml(CD)
.agents/   Agent canonical skills
.claude/   Claude Code 設定與 skill adapters
.cursor/   Cursor rules
docs/      架構 / PM 指南 / 部署
```

## 文件

完整索引見 **[docs/README.md](docs/README.md)（文件地圖）**。最常用的入口：

- **功能規格** → [docs/SPEC.md](docs/SPEC.md)（目前提供哪些功能、怎麼運作；對焦需求與驗收、防改壞）
- **非工程師** → [docs/PM_GUIDE.md](docs/PM_GUIDE.md)（用 AI Agent 加功能的劇本）
- **AI Agent** → [AGENTS.md](AGENTS.md)（工程契約，唯一規範來源）
- **工程師入門** → [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md)（環境、Lint 工具鏈、指令、CI）→ [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)（架構與設計理由）→ [docs/PRINCIPLES.md](docs/PRINCIPLES.md)（生產鐵則）
- **深度技術參考** → 後端 [BACKEND](docs/BACKEND.md)、非同步 [CELERY](docs/CELERY.md)、前端 [FRONTEND](docs/FRONTEND.md)、Mobile [MOBILE](docs/MOBILE.md)、基礎設施 [INFRASTRUCTURE](docs/INFRASTRUCTURE.md)、後台 [ADMIN](docs/ADMIN.md)、安全 [SECURITY](docs/SECURITY.md)
- **參考資料** → [環境變數](docs/ENVIRONMENT.md)、[API](docs/API.md)、[測試](docs/TESTING.md)、[部署](docs/DEPLOYMENT.md)

## 用這個模板開新專案

1. 複製本 repo，把 `fullstackapp` 字樣換成你的專案名（image 前綴、network、DB 名、`APP_NAME`、`ADMIN_SITE_TITLE`、`ADMIN_SITE_HEADER` 等）。
2. `cp backend/env/.env.dev.example backend/env/.env.dev`，需要時調整。
3. `make dev` 確認綠燈後開始長功能。
