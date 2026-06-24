# 文件地圖

這個專案的所有文件索引。**這份是 canonical 索引**，README.md 與 AGENTS.md 都指向這裡。

## 規範 vs 說明（先看這個）

| 類型 | 文件 | 性質 |
|------|------|------|
| **規範（normative）** | [AGENTS.md](../AGENTS.md)、[PRINCIPLES.md](PRINCIPLES.md) | 「你必須怎麼做」。衝突時**以這些為準**。 |
| **說明（informative）** | 本資料夾其餘文件 | 「系統實際怎麼運作」。協助理解，不可與規範牴觸；若發現牴觸，以規範為準並回報。 |

> 改了程式碼導致說明文件過時，請順手更新對應的說明文件；改了規則請更新 AGENTS.md / PRINCIPLES.md。

---

## 給非工程師

- [PM_GUIDE.md](PM_GUIDE.md) — 用 AI Agent VibeCoding 的劇本（起站、加功能、驗收、上線）。

## 給 AI Agent

- [../AGENTS.md](../AGENTS.md) — ★ 工程契約（唯一規範來源），任何 agent 動工前先讀。
- [../CLAUDE.md](../CLAUDE.md) — Claude Code 專屬入口（skills、指令）。
- [PRINCIPLES.md](PRINCIPLES.md) — ★ 生產原則鐵則 + 落地檢查清單（每加功能必讀）。
- `.claude/skills/` — 把「加功能 / 驗證 / 部署 / 排查」固化成可觸發的技能。

## 給工程師

**入門（照順序）**

1. [../README.md](../README.md) — 專案是什麼、5 分鐘起站。
2. [DEVELOPMENT.md](DEVELOPMENT.md) — 開發環境、**Lint/Format/Typecheck 工具鏈**、所有 make 指令、pre-commit、CI 對照。
3. [ARCHITECTURE.md](ARCHITECTURE.md) — 整體架構與「為什麼這樣設計」（各段落連到下面的深度參考）。
4. [PRINCIPLES.md](PRINCIPLES.md) — 上線前必須想到的事。
5. [../CONTRIBUTING.md](../CONTRIBUTING.md) — 分支模型、commit 規範、PR 流程。

**深度技術參考（各子系統的實作細節）**

| 文件 | 涵蓋 |
|------|------|
| [BACKEND.md](BACKEND.md) | 設定分層、model→serializer→service→view 分層、common、認證、middleware、錯誤格式、健康檢查、logging、儲存 |
| [CELERY.md](CELERY.md) | 非同步任務：佇列 / worker / 可靠性 / log 串接 / 心跳 / 任務衛生 / 新增佇列 |
| [FRONTEND.md](FRONTEND.md) | Web 前端：API client / JWT refresh / React Query / Vite / 表單 / 測試 |
| [MOBILE.md](MOBILE.md) | Mobile：Expo/Bare 選型 + api client / SecureStore / queryClient / feature 切片 / EAS |
| [INFRASTRUCTURE.md](INFRASTRUCTURE.md) | Docker 多階段 / compose / entrypoints / deploy.sh / 備份 |
| [ADMIN.md](ADMIN.md) | Django Admin + django-unfold 後台（案主用） |
| [SECURITY.md](SECURITY.md) | 認證 / 權限 / 限流 / DDoS / 祕密 / 安全 header 彙整 |

**參考資料**

| 文件 | 涵蓋 |
|------|------|
| [ENVIRONMENT.md](ENVIRONMENT.md) | 環境變數完整參考（dev/stage/prod、預設值、必填） |
| [API.md](API.md) | API 端點概覽（OpenAPI 為單一來源） |
| [TESTING.md](TESTING.md) | 三端測試框架與寫法 |
| [DEPLOYMENT.md](DEPLOYMENT.md) | 伺服器、祕密、Caddy、備份還原 |

---

## 規範性 vs 說明性對照（給 AI 快速判斷）

```
規範（衝突以此為準）
  AGENTS.md ............. 工程契約：技術棧、分層、流程、嚴禁事項
  PRINCIPLES.md ........ 生產鐵則 + 檢查清單
說明（協助理解，不得牴觸規範）
  ARCHITECTURE.md ...... 為什麼這樣設計（樞紐，連向各深度頁）
  BACKEND / CELERY / FRONTEND / MOBILE / INFRASTRUCTURE / ADMIN / SECURITY .. 怎麼運作
  ENVIRONMENT / API / TESTING / DEPLOYMENT .. 參考資料
```
</content>
