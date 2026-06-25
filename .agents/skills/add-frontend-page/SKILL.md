---
name: add-frontend-page
description: 在前端新增或修改頁面 / 功能切片。當使用者要新增、刪除、修改 Web 畫面、表單、列表、或「前端加一個 X 頁面」時使用。除非使用者明確說只改 Web，還要同步檢查 mobile 是否需要同等介面更新。
---

# 新增前端頁面

照既有 `frontend/src/features/items/` 的結構複製。**先讀它**當範本。

## 跨介面要求

- 除非使用者明確說「只改 web / 只改前端」，新增、刪除、修改使用者可見功能時，也要同步檢查 `mobile/src/features/` 是否需要新增、移除或修改對應 screen/form/hooks/API 型別。
- 若後端 API、serializer 欄位、權限、狀態流程或 validation 有變，Web 與 Mobile 的 API 型別、hooks、表單規則、錯誤處理都要一起對齊。
- 回報時要明確寫出 Mobile 已同步、無需同步的原因，或使用者要求只改 Web。

## 步驟

1. **建立 feature 目錄** `frontend/src/features/<feature>/`：
   - `api.ts`：用 `@/lib/api` 的 `api` 實例呼叫後端，定義 TypeScript 介面（對應後端 serializer 欄位）。
   - `hooks.ts`：用 `@tanstack/react-query` 的 `useQuery`/`useMutation` 包 `api.ts`，mutation 成功後 `invalidateQueries`。
   - `<Feature>Page.tsx`：頁面組件，用 hooks 取資料。
   - `<Feature>Form.tsx`：表單用 `react-hook-form` + `zod`（`@hookform/resolvers/zod`）。

2. **加路由**：在 `frontend/src/App.tsx` 的 `<Routes>` 加 `<Route>`。需要登入的頁面用 `<RequireAuth>` 包起來。

3. **UI**：用 `@/components/ui/*`（button、input）與 Tailwind class（用 `cn()` 合併）。toast 用 `sonner`。

4. **測試**：在 `frontend/src/__tests__/` 加測試，用 MSW（`src/mocks/handlers.ts`）攔截 API，`renderWithProviders` 包 React Query。參考 `__tests__/ItemsPage.test.tsx`。

5. **驗證**：`npm --prefix frontend run lint && npm --prefix frontend run test && npm --prefix frontend run build`。確認 build 後的 `frontend/dist/index.html` 使用 `/static/assets/...`，可由 Django 同網域入口提供。若同步修改 Mobile，還要跑 `make mobile-check`。

## 慣例
- API 路徑走相對路徑 `/api/...`。dev 有兩個 Web 入口：`:3000` 是 Vite/HMR，`:8000` 是 Django 同網域模式；stage/prod 只有 Django/Caddy 同網域入口。
- 不要把 Vite production build 的 asset base 從 `/static/` 改回 `/assets/`，否則 Django/WhiteNoise 無法正確提供 JS/CSS。
- 不要在組件裡直接用 `fetch`/`axios`；一律經過 `@/lib/api`。
- 型別以後端為準（後端是單一事實來源）。
