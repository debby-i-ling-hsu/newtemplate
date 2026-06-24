# 測試指南

三端各有測試框架，全部跑在 CI（見 [DEVELOPMENT.md §7](DEVELOPMENT.md)）。原則：**新增 / 修改功能必附測試**；後端是單一事實來源，後端測試最重要。

| 層 | 框架 | 指令 |
|----|------|------|
| 後端 | Django `TestCase`（DRF `APITestCase`） | `make backend-test` |
| 前端 | Vitest + Testing Library + **MSW** | `make frontend-test` |
| Mobile | Jest（`jest-expo` preset）+ React Native Testing Library | `make mobile-test` |
| 全部 | — | `make check` |

---

## 後端

設定：`config/settings/test.py`（`DJANGO_SETTINGS_MODULE=config.settings.test`）。重點：

- **sqlite in-memory**：不依賴外部 Postgres，快。
- **Celery eager**：`CELERY_TASK_ALWAYS_EAGER=True`，任務同步執行、例外往上拋（測得到）。
- **快速密碼雜湊**：`MD5PasswordHasher`，建帳號不卡。
- **InMemoryStorage** media、locmem email、locmem cache。
- **關閉限流與 DDoS**：避免跨用例 cache 累積造成 429 偽陽性。

測試檔位置（一個 app 一份）：

```
backend/accounts/tests.py        認證流程
backend/items/tests.py           範例切片（CRUD / 權限 / 並發 / 任務）
backend/common/tests_admin.py    Admin 行為
backend/common/tests_spa.py      SPA fallback 路由
```

跑法：

```bash
make backend-test                                  # 全部
# 或進 venv 後針對單一 app / 測試類別：
cd backend && DJANGO_SETTINGS_MODULE=config.settings.test DJANGO_ENV=test \
  .venv/bin/python manage.py test items
```

**寫後端測試要涵蓋**（對照 [PRINCIPLES.md](PRINCIPLES.md)）：

- 權限與資料隔離：別的使用者拿不到你的資源（找不到回 404 不回 403）。
- 權威欄位由後端決定：client 送 `owner`/`price`/`role` 不被採用。
- 並發 / idempotency：讀-改-寫操作（如 `items/services.py` 的 `complete_item`）的正確性。
- 狀態機 / validation 邊界。

---

## 前端（Web）

設定：[frontend/vitest.config.ts](../frontend/vitest.config.ts)（jsdom 環境、`@` alias、globals）。
setup：[frontend/vitest.setup.ts](../frontend/vitest.setup.ts) 載入 jest-dom matcher 並啟動 **MSW**。

- **MSW（Mock Service Worker）**：API 在測試裡用 mock 攔截，handler 在 `src/mocks/handlers.ts`、server 在 `src/mocks/server.ts`。
- `onUnhandledRequest: "error"`：**沒被 mock 的請求會讓測試失敗**——逼你把每個 API 都 mock 清楚。
- render helper：`src/test-utils.tsx`（包好 QueryClient / Router 等 provider）。

測試檔：`src/**/__tests__/*.test.tsx`、`src/**/*.test.ts`（如 `src/__tests__/ItemsPage.test.tsx`、`src/lib/utils.test.ts`）。

```bash
make frontend-test                    # vitest run
npm --prefix frontend run test:watch  # watch 模式
```

加新功能時：在 `src/mocks/handlers.ts` 補對應 endpoint 的 mock，再測 Page/Form 的互動與狀態。

---

## Mobile

preset：`jest-expo`（package.json）。setup：[mobile/jest.setup.ts](../mobile/jest.setup.ts)。

- **`expo-secure-store` 被 mock 成記憶體 Map**：token 存取在測試裡可控、每個用例自動清空。
- module alias：`@/` → `src/`。
- 測試用 **React Native Testing Library**。

測試檔：`src/**/__tests__/*.{ts,tsx}`（如 `src/__tests__/Button.test.tsx`、`src/__tests__/tokens.test.ts`）。

```bash
make mobile-test    # jest --runInBand
npm --prefix mobile run test:watch
```

> Mobile 改動還要過 `make mobile-typecheck`（`tsc --noEmit`）與 `make mobile-lint`，或一次 `make mobile-check`。

---

## Web / Mobile 同步

任何功能新增 / 修改 / 刪除涉及 API 契約變動時，**Web 與 Mobile 的測試都要同步更新**（除非使用者明確限定單一平台）。詳見 [AGENTS.md](../AGENTS.md) 的「功能變更的跨介面契約」。

---

## CI

PR 與 push 到 `stage`/`prod` 會跑 [.github/workflows/ci.yml](../.github/workflows/ci.yml) 的 backend / frontend / mobile 三條 job。**測試沒過不算完成**，也別在回報時宣稱通過。
</content>
