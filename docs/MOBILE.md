# Mobile App

本 repo 的 mobile app 位於 `mobile/`，使用 Expo + React Native + TypeScript，目標是 iOS / Android 雙系統。Web 由 `frontend/` 負責，不使用 Expo Web 作為正式 web 入口。

## Expo / Bare 怎麼選

預設選 **Expo managed workflow**。React Native 官方建議新 App 使用 framework like Expo；Expo 提供 TypeScript scaffold、原生模組、development build、EAS Build 與 Jest 測試路線，適合作為通用模板。

只有在以下情況才改 Bare React Native：

- 必須長期維護大量 Swift / Kotlin 原生碼。
- 使用的原生 SDK 無法透過 Expo library、config plugin 或 development build 支援。
- 團隊已準備好維護 Xcode、Gradle、Pods、簽章與原生升級成本。

需要額外原生能力時，先用 Expo development build，不要直接 eject。

技術棧：Expo · React Native · TypeScript · React Query · React Hook Form · Zod · axios · expo-secure-store。與 Web 共用同一組後端 `/api/v1/` 與同一套資料/表單規則；差異主要在 token 儲存與 UI 元件。Web 版見 [FRONTEND.md](FRONTEND.md)。

## 目錄結構（feature 導向）

```
mobile/src/
  App.tsx           Provider 組裝
  lib/
    api.ts          ★ axios 實例（自動帶 JWT、401 自動 refresh）
    tokens.ts       token 存取（expo-secure-store）
    queryClient.ts  React Query client
    config.ts       設定（apiBaseUrl）
  components/        React Native 共用 UI（Button / TextField…）
  features/<f>/      ★ 一個功能一個資料夾
    api.ts          呼叫後端（一律經 @/lib/api）
    hooks.ts        React Query hooks
    <X>Screen.tsx   畫面
    <X>Form.tsx     表單（React Hook Form + Zod）
  types/            型別宣告（env.d.ts…）
```

`@/` alias 指向 `src/`（tsconfig + jest moduleNameMapper 都設好）。

原則：

- 後端 `/api/v1/` 是單一事實來源；資料形狀、驗證、權限都以 DRF serializer / OpenAPI 為準。
- Mobile 不直接碰 DB，不決定 owner、role、price 等權威欄位。
- API 呼叫一律走 `mobile/src/lib/api`，**不要**在 screen/component 直接 `fetch` 或 `axios`。
- JWT access/refresh token 一律走 `expo-secure-store`（**禁止** AsyncStorage / 明文）。
- Server state 用 React Query，表單用 React Hook Form + Zod。

## API client 與 JWT 自動 refresh（`lib/api.ts`）

與 Web 同一套邏輯，差別在 token 存取是 **async**（SecureStore）、header 用 `AxiosHeaders`：

- **request interceptor**：`await tokenStore.getAccess()` → 塞 `Authorization: Bearer <token>`。
- **response interceptor**：401 且未重試過 → `refreshAccessToken()`（打 `/accounts/token/refresh/`）→ 成功就重送原請求、失敗就 `tokenStore.clear()`。
- 併發去重：module 級 `refreshing` promise，多個同時 401 共用一次 refresh；每請求 `_retry` 旗標只重試一次。

### Token 存放（`lib/tokens.ts`）

```ts
import * as SecureStore from "expo-secure-store";
export const tokenStore = {
  getAccess: () => SecureStore.getItemAsync("access_token"),
  getRefresh: () => SecureStore.getItemAsync("refresh_token"),
  set: async (access, refresh?) => { ... },   // 全 async
  clear: async () => { ... },
};
```

測試裡 `expo-secure-store` 被 mock 成記憶體 Map（`jest.setup.ts`），見 [TESTING.md](TESTING.md)。

## 設定（`lib/config.ts`）

```ts
export const config = {
  apiBaseUrl: process.env.EXPO_PUBLIC_API_BASE_URL || "http://localhost:8000/api/v1",
};
```

`EXPO_PUBLIC_API_BASE_URL` 是 Expo 的 public env（build 時注入）。各執行環境的值見下方「本機執行」。

## 資料層與表單

- React Query（`lib/queryClient.ts`）：每個 feature 的 `hooks.ts` 放 query/mutation，`api.ts` 放 axios 呼叫，mutation 成功後 `invalidateQueries` 刷新。
- 表單：`<X>Form.tsx` 用 React Hook Form + Zod；權威驗證仍在後端，前端 Zod 只是即時 UX，後端統一錯誤格式（`{error:{...}}`）要顯示給使用者。

## 加一個 Mobile 功能

照 `mobile/src/features/items/` 複製：`api.ts`（經 `@/lib/api`）→ `hooks.ts` → `Screen` / `Form` → 接進 App flow → Jest + RNTL 測試。除非明確只改 Mobile，要同步檢查 Web 是否需要同等更新。詳見 skill `add-mobile-feature` 與 [AGENTS.md](../AGENTS.md)。

## 本機執行

```bash
make dev
make dev-health
npm --prefix mobile install
npm --prefix mobile run start
```

API base URL 由 `EXPO_PUBLIC_API_BASE_URL` 控制，可參考 `mobile/.env.example`。

常見設定：

```bash
# iOS Simulator
EXPO_PUBLIC_API_BASE_URL=http://localhost:8000/api/v1 npm --prefix mobile run ios

# Android Emulator
EXPO_PUBLIC_API_BASE_URL=http://10.0.2.2:8000/api/v1 npm --prefix mobile run android

# 實體手機：手機與電腦需在同一網路
EXPO_PUBLIC_API_BASE_URL=http://<LAN-IP>:8000/api/v1 npm --prefix mobile run start
```

## 測試與檢查

Mobile 有改一定跑：

```bash
npm --prefix mobile run lint
npm --prefix mobile run typecheck
npm --prefix mobile run test
```

或：

```bash
make mobile-check
```

整個 repo 的 CI 等價檢查：

```bash
make check
```

## Build / 發佈

本機開發用 Expo Go 或 simulator。需要加入自訂原生 SDK 時，改用 development build：

```bash
npx --prefix mobile eas build --profile development --platform ios
npx --prefix mobile eas build --profile development --platform android
```

正式 binary 走 EAS Build：

```bash
make mobile-preview
npx --prefix mobile eas build --profile production --platform ios
npx --prefix mobile eas build --profile production --platform android
```

`make mobile-preview` 會先跑 mobile 檢查，再同時送出 Android preview APK 與 iOS TestFlight build。`eas.json` 已提供 `development`、`preview`、`testflight`、`production` profile 作為範例；App Store / Play Store submit 需要專案自己的 bundle id、package name、EAS project、profile 與簽章設定，模板預設值只是 placeholder。
