# 貢獻指南

開始前**先讀 [AGENTS.md](AGENTS.md)**（工程契約，唯一事實來源）。本檔補充協作流程：分支模型、commit 規範、PR 流程。
開發環境與工具鏈見 [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md)。

---

## 分支模型 — 「分支即環境」

| 分支 | 對應 | 部署 |
|------|------|------|
| `stage` | 預設整合分支 | push 後 CD 自動部署 stage |
| `prod` | 正式環境 | push 後 CD 自動部署 prod（一般是把驗過的 `stage` merge 進來） |
| `feature/*`、`fix/*` | 你的工作分支 | 不部署；開 PR 回 `stage` |

流程：

```
從 stage 開工作分支 → 開發 → make check 綠燈 → 開 PR 回 stage
   → CI 綠燈 + review → merge 進 stage（自動部署 stage 驗證）
   → 驗過後把 stage merge 進 prod（自動部署 prod）
```

> ⚠️ 別直接 push 到 `prod`，也別繞過 `scripts/deploy.sh` 手動部署。CD 與部署閘門見 [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) 與 [docs/INFRASTRUCTURE.md](docs/INFRASTRUCTURE.md)。

---

## Commit 規範

用 Conventional Commits 前綴，描述可用繁體中文：

```
feat: 後台新增訂單匯出
fix: dev 也 build 前端
chore: rename repo
docs: 補工程文件
refactor: items service 抽出狀態轉換
test: 補 items 並發測試
```

常用前綴：`feat` / `fix` / `chore` / `docs` / `refactor` / `test` / `perf` / `ci`。

---

## PR 前的檢查清單

提 PR 前在本機跑過，避免 CI 紅燈：

- [ ] `make check` 綠燈（backend + frontend + mobile，= CI）。
- [ ] 改了 model → 已 `make dev-makemigrations`（**不手寫/手改 migration**）。
- [ ] 涉及 API 契約變動 → Web 與 Mobile 都同步更新（型別 / hooks / 畫面 / 測試），除非明確只改單一平台。
- [ ] 新增營運用 model → 同步完成 Django Admin（繁中、RWD、可操作）。
- [ ] 對照 [docs/PRINCIPLES.md](docs/PRINCIPLES.md) 的落地清單（並發 / idempotency / N+1 / 權限 / migration 安全性）。
- [ ] 沒有 commit 任何 `backend/env/.env.*`（非 `.example`）或 `backups/` 內備份檔。
- [ ] pre-commit 通過（`pre-commit run --all-files`）。

PR 說明建議寫清楚：改了什麼、為什麼、Web/Mobile 各自處理結果、跑過哪些檢查。

---

## 嚴禁（摘自 AGENTS.md）

- ❌ commit `backend/env/.env.dev|stage|prod|local`（只有 `.example` 進版控）。
- ❌ commit `backups/` 內備份檔（可能含正式資料）。
- ❌ 手寫或手改 migration。
- ❌ 繞過 `scripts/deploy.sh` 部署，或閘門失敗硬上。
- ❌ 在 view/serializer 塞商業邏輯；在前端 / mobile 元件直接 `fetch`/`axios`。
- ❌ 把 JWT 存到 AsyncStorage / 明文檔（一律 `expo-secure-store`）。
- ❌ 未經確認執行對外、難復原的動作（部署、刪 / 覆蓋資料、`*-restore`）。

完整契約見 [AGENTS.md](AGENTS.md)。
</content>
