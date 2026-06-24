---
name: add-mobile-feature
description: 在 Expo React Native mobile app 新增或修改功能切片。當使用者要新增、刪除、修改 iOS/Android App 畫面、表單、列表、或「mobile 加一個 X 功能」時使用。除非使用者明確說只改 Mobile，還要同步檢查 Web 是否需要同等介面更新。
---

# 新增 Mobile 功能

照既有 `mobile/src/features/items/` 的結構複製。**先讀它**當範本。

## 跨介面要求

- 除非使用者明確說「只改 mobile」，新增、刪除、修改使用者可見功能時，也要同步檢查 `frontend/src/features/` 是否需要新增、移除或修改對應 page/form/hooks/API 型別。
- 若後端 API、serializer 欄位、權限、狀態流程或 validation 有變，Mobile 與 Web 的 API 型別、hooks、表單規則、錯誤處理都要一起對齊。
- 回報時要明確寫出 Web 已同步、無需同步的原因，或使用者要求只改 Mobile。

## 步驟

1. **建立 feature 目錄** `mobile/src/features/<feature>/`：
   - `api.ts`：用 `@/lib/api` 的 `api` 實例呼叫後端，型別對齊 DRF serializer / OpenAPI。
   - `hooks.ts`：用 `@tanstack/react-query` 包 API，mutation 成功後 `invalidateQueries`。
   - `<Feature>Screen.tsx`：React Native 畫面，使用 hooks 取資料。
   - `<Feature>Form.tsx`：表單用 `react-hook-form` + `zod`。

2. **掛進 App flow**：在 `mobile/src/App.tsx` 或既有 mobile navigation 入口加入畫面。

3. **API 與安全**：
   - 不要在 screen/component 直接 `fetch` / `axios`；一律走 `mobile/src/lib/api`。
   - JWT 不放 AsyncStorage；一律走 `mobile/src/lib/tokens.ts` 的 SecureStore。
   - owner / role / price 等權威欄位由後端決定，不信任 mobile 輸入。

4. **測試**：在 `mobile/src/__tests__/` 加 Jest + React Native Testing Library 測試。

5. **驗證**：
   ```
   npm --prefix mobile run lint
   npm --prefix mobile run typecheck
   npm --prefix mobile run test
   ```
   若同步修改 Web，還要跑 `npm --prefix frontend run lint && npm --prefix frontend run test && npm --prefix frontend run build`。

## 慣例

- API base URL 走 `EXPO_PUBLIC_API_BASE_URL`。
- iOS simulator 使用 `http://localhost:8000/api/v1`。
- Android emulator 使用 `http://10.0.2.2:8000/api/v1`。
- 實體手機使用電腦區網 IP。
