# 前端技術參考

Web 前端（React + Vite）的實作細節。Mobile 見 [MOBILE.md](MOBILE.md)；工具鏈 / lint 見 [DEVELOPMENT.md](DEVELOPMENT.md)；API 契約見 [API.md](API.md)。

技術棧：React 18 · Vite · TypeScript · Tailwind · React Query · React Hook Form · Zod · React Router · axios · sonner（toast）。

---

## 1. 目錄結構（feature 導向）

```
frontend/src/
  main.tsx          進入點
  App.tsx           Provider + Router
  config/index.ts   設定（apiBaseUrl）
  lib/
    api.ts          ★ axios 實例（自動帶 JWT、401 自動 refresh）
    tokens.ts       token 存取（localStorage）
    queryClient.ts  React Query client
    utils.ts        共用工具
  components/ui/     共用 UI（button / input…）
  features/<f>/      ★ 一個功能一個資料夾
    api.ts          呼叫後端（一律經 @/lib/api）
    hooks.ts        React Query hooks
    <X>Page.tsx     畫面
    <X>Form.tsx     表單（React Hook Form + Zod）
  mocks/            MSW handlers / server（測試）
  test-utils.tsx    測試 render helper
```

**鐵則**：所有 API 一律走 `@/lib/api`，**不要**在 component 直接 `fetch`/`axios`。`@` 是 `src/` 的 alias（vite + vitest + tsconfig 都設好）。

---

## 2. API client 與 JWT 自動 refresh（`lib/api.ts`）

單一 axios 實例，兩個 interceptor：

- **request**：從 `tokenStore` 取 access token，塞 `Authorization: Bearer <token>`。
- **response**：遇 401 且該請求沒重試過 → 用 refresh token 換新 access → 重送原請求。

```
請求 → 401 → refreshAccessToken() → 成功：set 新 access、重送原請求
                                  → 失敗：tokenStore.clear()，往上拋
```

防併發重複 refresh：用一個 module 級 `refreshing` promise，多個同時 401 的請求共用同一次 refresh。每個請求用 `_retry` 旗標確保只重試一次。refresh 打 `/accounts/token/refresh/`。

> Mobile 的 `lib/api.ts` 是同一套邏輯，差別只在 token 存取是 async（SecureStore）、用 `AxiosHeaders`。見 [MOBILE.md](MOBILE.md)。

### Token 存放（`lib/tokens.ts`）

Web 用 **localStorage**（`access_token` / `refresh_token`），集中在 `tokenStore`，日後要改 cookie 策略只改這一處。

> ⚠️ Mobile **不可**用 AsyncStorage / 明文存 JWT，一律 `expo-secure-store`。

---

## 3. 設定（`config/index.ts`）

```ts
export const config = {
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL || "/api/v1",
};
```

預設打**同網域相對路徑** `/api/v1`：

- dev（`:3000`）：由 Vite proxy 轉到後端。
- stage/prod：Web SPA 與 API 同網域，相對路徑直接命中。

---

## 4. Vite 設定（`vite.config.ts`）

| 項目 | 值 | 說明 |
|------|----|------|
| `base` | production `/static/`、dev `/` | **production asset base 必須是 `/static/`**，Django 靠它服務 `frontend/dist`；不要改回 `/assets/` |
| `server.port` | 3000 | dev HMR 入口 |
| `server.proxy` | `/api`、`/admin`、`/static`、`/media`、`/healthz` → `VITE_DEV_PROXY_TARGET`（compose 內 `web:8000`，否則 `127.0.0.1:8000`） | dev 同網域行為 |
| `resolve.alias` | `@` → `src` | |
| plugin | `@vitejs/plugin-react-swc` | |

build：`npm run build` = `tsc -b && vite build`（**型別檢查內含在 build**），產出 `frontend/dist`。Django 用 `STATICFILES_DIRS` 收整個 dist，SPA fallback 回 `dist/index.html`。

---

## 5. 應用組裝（`App.tsx`）

```
QueryClientProvider          React Query
  BrowserRouter              React Router
    Routes
      /login, /register      公開
      /                      <RequireAuth><ItemsPage/></RequireAuth>
  Toaster                    sonner toast（top-center）
```

需登入的頁面包 `<RequireAuth>`（`features/auth/RequireAuth.tsx`）。

---

## 6. 資料層：React Query（`lib/queryClient.ts`）

```ts
new QueryClient({ defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false } } });
```

- Server state 一律用 React Query（`useQuery` / `useMutation`），不要自己 `useState` + `useEffect` 拉資料。
- 每個 feature 的 `hooks.ts` 放該功能的 query/mutation hooks，`api.ts` 放實際 axios 呼叫。
- mutation 成功後 `invalidateQueries` 讓列表自動刷新（範例見 `features/items/hooks.ts`）。

---

## 7. 表單：React Hook Form + Zod

- 表單在 `<X>Form.tsx`，用 `react-hook-form` + `@hookform/resolvers` 接 Zod schema。
- **驗證以後端為準**：前端 Zod 只是即時 UX，權威驗證在後端 serializer；後端回的統一錯誤格式（`{error:{...}}`）要顯示給使用者。

---

## 8. 樣式

Tailwind（`tailwind.config.ts` + `postcss.config.js`），搭 `class-variance-authority` / `clsx` / `tailwind-merge` 組 variant，`lucide-react` icon、`tailwindcss-animate` 動畫。共用 UI 在 `components/ui/`。

---

## 9. 測試

Vitest（jsdom）+ Testing Library + **MSW**（mock API）。`onUnhandledRequest: "error"`：沒 mock 的請求會讓測試失敗。詳見 [TESTING.md](TESTING.md)。

---

## 10. 加一個前端功能

照 `frontend/src/features/items/` 複製：`api.ts`（經 `@/lib/api`）→ `hooks.ts`（React Query）→ `Page` / `Form` → `App.tsx` 加路由（需登入包 `<RequireAuth>`）→ `mocks/handlers.ts` 補 mock → 測試。除非明確只改 Web，要同步檢查 Mobile 是否需要同等更新。詳見 skill `add-frontend-page` 與 [AGENTS.md](../AGENTS.md)。
</content>
