# CLAUDE.md

**先讀 [AGENTS.md](AGENTS.md)** — 那是本 repo 的唯一工程契約（技術棧、目錄分層、核心原則、加功能流程、必跑驗證、嚴禁事項）。本檔只補充 Claude Code 專屬用法。

## 可用 Skills

本 repo 在 `.claude/skills/` 提供以下 skill，遇到對應任務時請主動使用：

- `add-backend-feature` — 新增後端功能（Django app）。
- `admin-backoffice-ux` — 設計或修改 Django Admin 後台 UX。
- `add-frontend-page` — 新增前端頁面 / 功能切片。
- `add-mobile-feature` — 新增 Mobile App 功能切片（Expo React Native）。
- `run-checks` — 改完程式碼後的最小驗證。
- `deploy-safely` — 部署 stage/prod 並解讀閘門。
- `troubleshoot` — healthz 紅燈 / 容器起不來 / migration 衝突等排查。

## 常用指令

```
make dev            # 起本機環境（Vite :3000 / Django 同網域 :8000）
make dev-health     # 看 /healthz/ready/
make check          # 跑所有檢查（= CI）
make dev-makemigrations
make mobile-start   # 啟動 Expo dev server
make mobile-check   # Mobile lint + typecheck + test
make stage / make prod   # 安全部署
make help           # 列出所有指令
```

## 注意

- `.claude/settings.json` 已預先放行上述 make/test/docker 指令，並**禁止讀取** `backend/env/.env.*` 實檔（祕密）。
- 第一次 `make dev` 會自動把 `.env.dev.example` 複製成 `.env.dev`。
- 後端格式/lint 用 `ruff` + `black`（設定在 `backend/pyproject.toml`），需先 `make backend-venv`。
- 新增、刪除、修改使用者可見功能時，除非使用者明確限定只改單一介面，預設要同步檢查並更新 Web (`frontend/`) 與 Mobile (`mobile/`) 介面，且回報兩邊的處理結果。
- 案主/營運後台一律用 Django Admin + django-unfold；新增 model 時要同步完成繁體中文、RWD、非工程師可理解的 Admin UX。
- stage/prod 的 Web SPA 由 Django 同網域提供；dev 也要保留 `http://localhost:8000/` 可訪問 Web，`http://localhost:3000/` 只作為 Vite/HMR 開發入口。
