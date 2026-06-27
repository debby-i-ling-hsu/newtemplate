# 環境變數參考

所有後端設定都「有預設值、可被環境變數覆寫」（`django-environ`）。程式碼**不寫死祕密**。

- 後端變數放 `backend/env/.env.<env>`（**不進版控**，只有 `.env.<env>.example` 進版控）。
- 三套環境共用 `backend/config/settings/base.py`，各自只覆寫差異（`dev`/`stage`/`prod`/`test`）。
- 預設值來源為 [base.py](../backend/config/settings/base.py)；範本見 `backend/env/.env.{dev,stage,prod}.example`。
- 前端 / Mobile 另有各自的 `EXPO_PUBLIC_*` / Vite 變數，見最後一節。

> 「必填」欄：✅ = stage/prod 上線前一定要填真實值；空白 = 有合理預設、選填。

---

## 應用 / 核心

| 變數 | 預設 | 必填 | 說明 |
|------|------|:---:|------|
| `DJANGO_ENV` | `dev` | | 環境名（`dev`/`stage`/`prod`/`test`），決定載哪個 settings |
| `DJANGO_SETTINGS_MODULE` | — | ✅ | 例：`config.settings.prod` |
| `SECRET_KEY` | `dev-insecure-change-me` | ✅ | Django 密鑰；stage/prod **務必換** |
| `DEBUG` | `False` | | 只有 dev 開 `True` |
| `ALLOWED_HOSTS` | `127.0.0.1,localhost,web` | ✅ | 逗號分隔；要含對外網域與 `web` |
| `APP_NAME` | `fullstackapp` | | 專案名（複製模板後改） |
| `APP_VERSION` | `0.1.0` | | 版本字串（進結構化 log） |

## 後台（Django Admin）

| 變數 | 預設 | 必填 | 說明 |
|------|------|:---:|------|
| `ADMIN_SITE_TITLE` | `{APP_NAME} 後台` | | 瀏覽器分頁標題 |
| `ADMIN_SITE_HEADER` | `{APP_NAME} 後台` | | 後台頁首 |
| `ADMIN_INDEX_TITLE` | `管理首頁` | | 後台首頁標題 |

> 複製模板後務必把上面三個改成專案名稱，不要留模板名。

## 資料庫（PostgreSQL）

| 變數 | 預設 | 必填 | 說明 |
|------|------|:---:|------|
| `DATABASE_URL` | — | ✅ | 例：`postgres://user:pw@db:5432/dbname` |
| `POSTGRES_DB` / `POSTGRES_USER` / `POSTGRES_PASSWORD` | — | ✅(stage/prod) | compose `db` 服務用；密碼要與 `DATABASE_URL` 內一致 |
| `DB_USE_POOL` | `False` | | 是否用 psycopg pool（stage/prod 建議 `True`） |
| `DB_POOL_MIN_SIZE` | `1` | | pool 最小連線數 |
| `DB_POOL_MAX_SIZE` | `8` | | pool 最大連線數 |
| `DB_CONN_MAX_AGE` | `0` | | 連線復用秒數 |
| `DB_CONN_HEALTH_CHECKS` | `True` | | 復用前健康檢查 |

## Redis / Celery

| 變數 | 預設 | 必填 | 說明 |
|------|------|:---:|------|
| `CELERY_BROKER_URL` | `redis://redis:6379/0` | | broker |
| `CELERY_RESULT_BACKEND` | `redis://redis:6379/1` | | result backend |
| `CACHE_URL` | `redis://redis:6379/3` | | Django cache（worker 心跳也寫這） |
| `CELERY_REQUIRED_WORKERS` | （空） | | `/healthz/ready/` 檢查必須在線的 worker；stage/prod 設 `worker-default,worker-maintenance,worker-long-running` |
| `CELERY_TASK_SOFT_TIME_LIMIT` | `600` | | 任務軟逾時（秒） |
| `CELERY_TASK_TIME_LIMIT` | `900` | | 任務硬逾時（秒） |

## API / 限流 / 分頁 / JWT

| 變數 | 預設 | 說明 |
|------|------|------|
| `DRF_PAGE_SIZE` | `20` | list 端點分頁大小 |
| `THROTTLE_ANON` | `60/min` | 匿名限流 |
| `THROTTLE_USER` | `1000/min` | 登入使用者限流 |
| `THROTTLE_LOGIN` | `10/min` | 登入端點限流（收緊） |
| `JWT_ACCESS_MINUTES` | `30` | access token 壽命 |
| `JWT_REFRESH_DAYS` | `7` | refresh token 壽命 |

## CORS / CSRF

| 變數 | 預設 | 說明 |
|------|------|------|
| `CORS_ALLOW_ALL_ORIGINS` | `False` | dev 用 `True`；stage/prod 同網域不需放寬 |
| `CORS_ALLOWED_ORIGINS` | （空） | 白名單來源（逗號分隔） |
| `CORS_ALLOW_CREDENTIALS` | `True` | 帶 cookie |
| `CSRF_TRUSTED_ORIGINS` | （空） | stage/prod 填 `https://你的網域` |

## Media / 儲存

| 變數 | 預設 | 必填 | 說明 |
|------|------|:---:|------|
| `DEFAULT_FILE_STORAGE` | — | ✅(stage/prod) | dev：`django.core.files.storage.FileSystemStorage`；stage/prod：`common.storage.AutoCreateAzureStorage` |
| `MEDIA_URL` | `/media/` | | dev 本地 media 路徑 |
| `AZURE_ACCOUNT_NAME` | （空） | ✅(stage/prod) | Azure 帳號；**stage 與 prod 必須不同**（deploy.sh 強制） |
| `AZURE_ACCOUNT_KEY` | （空） | ✅(stage/prod) | Azure 金鑰 |
| `AZURE_CONTAINER` | `media` | | container 名 |
| `AZURE_URL_EXPIRATION_SECS` | `3600` | | 簽名 URL 有效秒數 |
| `AZURE_CONNECTION_TIMEOUT_SECS` | `10` | | Azure Blob connect/read timeout 秒數 |
| `AZURE_CLIENT_RETRY_TOTAL` | `1` | | Azure SDK 重試次數；部署 smoke test 要避免卡太久 |
| `STORAGE_SMOKE_OPERATION_TIMEOUT_SECS` | `25` | | 部署 storage smoke test 每個 write/read/delete 步驟的 timeout 秒數 |

> static（CSS/JS/admin）三環境都用 WhiteNoise，無需額外變數。

## Email

| 變數 | 預設 | 說明 |
|------|------|------|
| `EMAIL_BACKEND` | `...console.EmailBackend` | dev 印到 console；stage/prod 例：`anymail.backends.sendgrid.EmailBackend` |
| `DEFAULT_FROM_EMAIL` | `no-reply@example.com` | 寄件者 |
| `SENDGRID_API_KEY` | — | 用 SendGrid 時填（anymail） |
| `EMAIL_HOST` / `EMAIL_PORT` / `EMAIL_HOST_USER` / `EMAIL_HOST_PASSWORD` / `EMAIL_USE_TLS` | `""` / `587` / `""` / `""` / `True` | 用 SMTP backend 時填 |

## Logging / 可觀測性

| 變數 | 預設 | 說明 |
|------|------|------|
| `LOG_FORMAT` | 依環境 | `console`（本機可讀）/ `json`（stage/prod） |
| `LOG_LEVEL` | `INFO` | log 等級 |
| `LOG_SERVICE_NAME` | `web` | process 名（compose 逐一設 `web`/`worker-default`/…） |
| `LOG_ERROR_FILE_ENABLED` | `True`（test 除外） | 是否把 `WARNING` 以上另存到 `backend/logs/errors/<env>-<service>.log` |
| `LOG_ERROR_RETENTION_DAYS` | `30` | warning/error log 檔每日輪替後保留天數 |
| `LOG_ERROR_DIR` | `backend/logs/errors` | warning/error log 檔目錄；stage/prod 會掛到 host |
| `REQUEST_LATENCY_WARN_MS` | `1500` | 超過此延遲記 warning |
| `REQUEST_LATENCY_LOG_ALL` | `False` | 是否記錄所有請求延遲 |
| `REQUEST_LATENCY_HEADER_ENABLED` | `False` | 是否回延遲 header |

## 錯誤追蹤（Sentry）

| 變數 | 預設 | 說明 |
|------|------|------|
| `SENTRY_DSN` | （空） | **留空 = 完全不啟用**；填了才啟用（Django + Celery integration、`send_default_pii=False`） |
| `SENTRY_TRACES_SAMPLE_RATE` | `0.0` | trace 取樣率 |

## 安全 / DDoS

| 變數 | 預設 | 說明 |
|------|------|------|
| `SECURE_SSL_REDIRECT` | `False` | prod 開 `True` |
| `DDOS_PROTECTION_ENABLED` | `False` | 邊界 IP 限流 middleware；stage/prod 開 |
| `DDOS_TRUSTED_PROXY_COUNT` | `1` | 反代跳數（Caddy 是唯一反代 → `1`） |
| `DDOS_DEFAULT_S` | `25` | 每秒上限 |
| `DDOS_DEFAULT_M` | `600` | 每分上限 |
| `DDOS_MAX_BODY_BYTES` | `0`（不限） | request body 上限 |
| `DDOS_TRUSTED_IPS` | （空） | 白名單 IP |

## 國際化

| 變數 | 預設 | 說明 |
|------|------|------|
| `LANGUAGE_CODE` | `zh-hant` | 語系 |
| `TIME_ZONE` | `Asia/Taipei` | 時區 |

---

## 前端 / Mobile

| 平台 | 變數 | 範例 | 說明 |
|------|------|------|------|
| Mobile | `EXPO_PUBLIC_API_BASE_URL` | `http://localhost:8000/api/v1` | API base；見 `mobile/.env.example`。iOS Simulator 用 `localhost`、Android Emulator 用 `10.0.2.2`、實機用電腦 LAN IP |
| Web | — | — | dev 由 Vite proxy 轉到 `:8000`；stage/prod 同網域，無需額外變數 |

詳見 [MOBILE.md](MOBILE.md)。

---

## 環境差異速查

| | dev | stage | prod |
|--|--|--|--|
| `DEBUG` | True | False | False |
| media | 本地檔案 | Azure Blob（stage 帳號） | Azure Blob（prod 帳號，≠ stage） |
| `LOG_FORMAT` | console | json | json |
| limit / throttle | 放寬 | 收緊 | 收緊 |
| `DDOS_PROTECTION_ENABLED` | False | True | True |
| `SECURE_SSL_REDIRECT` | False | False | True |
| DB pool | False | True | True |
| 測試 DB | — | — | — / `test` 用 sqlite in-memory |
</content>
