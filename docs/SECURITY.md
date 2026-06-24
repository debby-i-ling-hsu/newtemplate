# 安全技術參考

把散落各處的安全機制彙整成一張地圖。每項標明**機制**與**設定/實作在哪**。
規範（必須做到的）見 [PRINCIPLES.md](PRINCIPLES.md) 的「資安」一節；本檔是說明性彙整，衝突以 PRINCIPLES / AGENTS 為準。

---

## 1. 認證（JWT）

- SimpleJWT，`Authorization: Bearer <access>`；access 預設 30 分、refresh 7 天（`JWT_ACCESS_MINUTES` / `JWT_REFRESH_DAYS`）。
- 端點 `/api/v1/accounts/`：register / login / token/refresh / me。
- 前端 / Mobile 401 自動用 refresh 換新 access（併發去重）。
- Token 存放：**Web localStorage、Mobile expo-secure-store**；Mobile 禁止 AsyncStorage / 明文。

→ 實作見 [BACKEND.md](BACKEND.md) 的「認證」、[FRONTEND.md](FRONTEND.md) / [MOBILE.md](MOBILE.md) 的 API client。

## 2. 授權 / 資料隔離

- 屬於使用者的資料在 `get_queryset()` 用 `request.user` 過濾（list 防越權）。
- detail 第二道防線 `common.permissions.IsOwner`。
- **找不到別人的資源回 404 不回 403**，避免用 id 枚舉。
- 權威欄位（`owner`/`price`/`role`/`is_staff`）一律後端決定，不信任 client。

→ 實作見 [BACKEND.md](BACKEND.md) 的「共用元件」「分層架構」；範本 `items/`。

## 3. 限流（兩層）

| 層 | 機制 | 設定 |
|----|------|------|
| 應用層 | DRF throttle，per-user / per-scope；登入端點收緊 | `THROTTLE_ANON` / `THROTTLE_USER` / `THROTTLE_LOGIN` |
| 邊界 | `DDOSProtectionMiddleware`，per-IP / per-path（cache 計數器），stage/prod 開 | `DDOS_*`（見下） |

DDoS middleware 細節（IP 解析考慮反代跳數、白名單、body 上限）見 [BACKEND.md](BACKEND.md) 的「Middleware 堆疊」。限流數值見 [ENVIRONMENT.md](ENVIRONMENT.md)。

## 4. 安全 header / 傳輸

| 項目 | 設定 / 位置 |
|------|------|
| HSTS | stage 1 天、prod 30 天（`SECURE_HSTS_*`，settings/stage.py、prod.py） |
| SSL redirect | prod 預設開（`SECURE_SSL_REDIRECT`） |
| cookie secure | stage/prod `SESSION/CSRF_COOKIE_SECURE=True` |
| clickjacking | `ConditionalXFrameOptionsMiddleware`：`X-Frame-Options: DENY` + CSP `frame-ancestors 'none'` |
| 代理協定 | `SECURE_PROXY_SSL_HEADER` + `USE_X_FORWARDED_HOST`（Caddy 反代） |
| TLS 終結 | 伺服器上的 Caddy（不在 repo），見 [DEPLOYMENT.md](DEPLOYMENT.md) |

## 5. CORS / CSRF

- `CORS_ALLOW_ALL_ORIGINS`：dev `True`；stage/prod 同網域不放寬。
- `CSRF_TRUSTED_ORIGINS`：stage/prod 填對外網域。

→ 變數見 [ENVIRONMENT.md](ENVIRONMENT.md)。

## 6. 祕密管理

- 程式碼不寫死祕密；全走環境變數（`env("KEY", default=...)`）。
- 祕密只放 `backend/env/.env.<env>`（**不進版控**），只有 `.env.<env>.example` 進版控。
- pre-commit 的 `detect-private-key` 擋誤 commit 私鑰。
- 給 DB / 儲存最小權限帳號；stage 與 prod 用不同 Azure 帳號（deploy.sh 強制）。

→ 見 [ENVIRONMENT.md](ENVIRONMENT.md)、[CONTRIBUTING.md](../CONTRIBUTING.md) 的嚴禁事項。

## 7. 上傳檔 / 使用者內容

- 上傳要驗型別、大小、實際內容；別只信副檔名。
- 使用者內容用簽名 URL 提供（Azure，`AZURE_URL_EXPIRATION_SECS`）。

## 8. Log / 可觀測性

- log 記 `request_id` **不記 PII**；錯誤用 Sentry 對照 request_id（`send_default_pii=False`）。

→ 見 [BACKEND.md](BACKEND.md) 的「可觀測性」。

## 9. 部署安全閘門

- `manage.py check --deploy`、儲存閘門（Azure + prod≠stage 帳號）、健康閘門、失敗自動回滾。

→ 見 [INFRASTRUCTURE.md](INFRASTRUCTURE.md)、[DEPLOYMENT.md](DEPLOYMENT.md)。

---

## 加功能時的安全檢查清單

對照 [PRINCIPLES.md](PRINCIPLES.md) 的落地清單：

- [ ] 資料用 `request.user` 隔離？權威欄位後端決定？
- [ ] 找不到的資源回 404（不洩漏存在性）？
- [ ] 認證 / 敏感端點有限流？
- [ ] 上傳有驗型別 / 大小 / 內容？
- [ ] 沒把祕密 / PII 寫進 log 或 commit？
- [ ] 新設定有預設值、可被 env 覆寫、未寫死祕密？
</content>
