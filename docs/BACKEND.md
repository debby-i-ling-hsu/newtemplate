# 後端技術參考

Django 各子系統的實作細節。設計理由見 [ARCHITECTURE.md](ARCHITECTURE.md)；加功能流程見 [AGENTS.md](../AGENTS.md)；環境變數見 [ENVIRONMENT.md](ENVIRONMENT.md)；非同步見 [CELERY.md](CELERY.md)。

---

## 1. 設定分層（settings）

`backend/config/settings/` 採分層覆寫，所有共用設定在 `base.py`，各環境只覆寫差異。

```
base.py    共用設定（env() 讀環境變數、全部有預設值）
dev.py     from base import *；DEBUG、WhiteNoise finders、cookie 不強制 secure
stage.py   類 prod；DEBUG=False、cookie secure、HSTS 1 天
prod.py    DEBUG=False、cookie secure、HSTS 30 天、SECURE_SSL_REDIRECT 預設 True
test.py    sqlite in-memory、Celery eager、MD5 密碼、關限流（見 TESTING.md）
```

選哪一層由 `DJANGO_SETTINGS_MODULE` 決定（例 `config.settings.prod`）。

各層差異重點：

| | dev | stage | prod |
|--|--|--|--|
| `DEBUG` | True | False | False |
| `SESSION/CSRF_COOKIE_SECURE` | False | True | True |
| `SECURE_SSL_REDIRECT` | — | env，預設 False | env，預設 True |
| `SECURE_HSTS_SECONDS` | — | 86400（1 天） | 2592000（30 天） |
| WhiteNoise | finders + autorefresh（改檔即時） | 收集後服務 | 收集後服務 |

> dev 用 `WHITENOISE_USE_FINDERS=True` + `WHITENOISE_AUTOREFRESH=True`，免 `collectstatic`、改 static 即時生效。

設定原則：**程式碼不寫死祕密**，每個設定 `env("KEY", default=...)` 都有預設值且可被環境變數覆寫。

---

## 2. 分層架構：model → serializer → service → view

每個功能 app 照這個分層，**商業邏輯只在 `services.py`**，view 只處理 HTTP。範本是 `backend/items/`。

```
models.py       資料結構（繼承 common.TimeStampedModel）
serializers.py  輸入/輸出形狀與驗證（DRF）
services.py     ★ 商業邏輯（可被 view / Celery / command 重用、好測試）
views.py        只處理 HTTP（驗證、權限、回應）
urls.py         路由
tasks.py        Celery 背景任務（見 CELERY.md）
admin.py        Django Admin（見 admin-backoffice-ux skill）
tests.py        測試
```

### models — `common.TimeStampedModel`

所有業務 model 繼承共用基底（`backend/common/models.py`）：

```python
class TimeStampedModel(models.Model):
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)
    class Meta:
        abstract = True
```

`created_at` 預設加索引（常用來排序 / 分頁）。範例 `Item` 有 `owner`(FK→User, CASCADE)、`name`、`description`、`is_done`，`Meta.ordering = ["-created_at"]`。

### services — 商業邏輯與並發安全

`items/services.py` 的 `complete_item()` 是「敏感狀態變更」的正確範本，照它寫金流 / 庫存 / 計數：

```python
@transaction.atomic
def complete_item(*, user, item_id) -> tuple[Item, bool]:
    item = Item.objects.select_for_update().get(owner=user, id=item_id)  # 鎖列防 race
    if item.is_done:
        return item, False        # idempotent：已完成就 no-op
    item.is_done = True
    item.save(update_fields=["is_done", "updated_at"])
    return item, True
```

要點(對照 [PRINCIPLES.md](PRINCIPLES.md))：`transaction.atomic` + `select_for_update()` 鎖列防 read-modify-write race；idempotent 可安全重試；數值增減用 `F()`；**不要在 atomic 區塊裡呼叫外部 API**，副作用丟交易後的 Celery 任務。

### views — 只處理 HTTP + 資料隔離

`items/views.py` 的 `ItemViewSet`：

- `get_queryset()` 用 `request.user` 過濾（list 看不到別人的）。
- `perform_create(owner=request.user)`：權威欄位後端決定，不信任 client。
- `permission_classes = [IsAuthenticated, IsOwner]`：detail 第二道防線。
- `filterset_fields` / `search_fields` / `ordering_fields`：`?is_done=&search=&ordering=`。
- `queryset = Item.objects.none()`：僅供 schema 內省，實際走 `get_queryset()`。

---

## 3. 共用元件（`common/`）

| 檔案 | 內容 |
|------|------|
| `models.py` | `TimeStampedModel` 抽象基底 |
| `permissions.py` | `IsOwner` 物件層級權限 |
| `storage.py` | `AutoCreateAzureStorage`（容器不存在時自動建立） |
| `views.py` | `health_live` / `health_ready` / `spa` |
| `management/commands/storage_smoke_test.py` | 實打雲端儲存讀寫（部署閘門用） |

### IsOwner — 兩道防線

```python
class IsOwner(permissions.BasePermission):
    def has_object_permission(self, request, view, obj):
        return getattr(obj, "owner_id", None) == getattr(request.user, "id", None)
```

第一道是 `get_queryset()` 用 `request.user` 過濾（list 防枚舉，找不到回 **404 不回 403**）；第二道是 `IsOwner`（detail 防漏網）。兩者並用。

---

## 4. 認證（JWT）

`accounts/` app，使用 `djangorestframework-simplejwt`。

- **自訂 User**（`accounts/models.py`）：專案一開始就用 `AbstractUser` 子類（多了 `display_name`），日後擴充欄位不難改。預設仍 username 登入，要改 email 登入調 `USERNAME_FIELD`。
- **端點**（`/api/v1/accounts/`）：`register/`（公開）、`login/`（換 `{access, refresh}`，套 `login` scope 限流）、`token/refresh/`（換新 access）、`me/`（需登入）。
- **Token 壽命**：access 預設 30 分（`JWT_ACCESS_MINUTES`）、refresh 預設 7 天（`JWT_REFRESH_DAYS`）。
- **限流**：登入端點用 `ScopedRateThrottle` scope=`login`（比一般 user/anon 嚴），外加邊界 DDoS middleware，雙層。

前端 / Mobile 的 401 自動 refresh 流程見 [FRONTEND.md](FRONTEND.md)。

---

## 5. Middleware 堆疊

`backend/config/middleware.py` 四個自訂 middleware：

| Middleware | 作用 |
|-----------|------|
| `RequestIDMiddleware` | 沿用或產生 `X-Request-ID`（16 碼），寫入 contextvar 供 log 串接，回寫 response header |
| `ConditionalXFrameOptionsMiddleware` | `X-Frame-Options: DENY` + CSP `frame-ancestors 'none'`（防 clickjacking） |
| `RequestLatencyMiddleware` | 量每個請求耗時；≥`REQUEST_LATENCY_WARN_MS`(預設 1500) 或 5xx 記 warning；可選回 `X-Request-Duration-MS` header；略過 `/healthz`、`/static`、`/assets`、`/media` |
| `DDOSProtectionMiddleware` | per-IP、per-path rate limit（cache 計數器，stage/prod 開） |

### DDoS middleware 細節

- 用 cache 做秒/分兩層滑動計數（key `ddos:{ip}:{name}:{window}:{value}`），超限回 429。
- **client IP 解析考慮反代跳數**：`X-Forwarded-For` 可偽造，只信任 `DDOS_TRUSTED_PROXY_COUNT` 之後的那一段（Caddy 是唯一反代 → 設 `1`）。
- 跳過靜態資源的 GET/HEAD/OPTIONS（`/assets/`、`/static/`、`/media/`、`favicon.ico`、`robots.txt`）。
- 支援 `DDOS_TRUSTED_IPS` 白名單、`DDOS_MAX_BODY_BYTES`（超過回 413）、`DDOS_PATH_LIMITS` per-path 自訂限制。
- 速率變數見 [ENVIRONMENT.md](ENVIRONMENT.md)。

---

## 6. 統一錯誤格式

`config/exceptions.py` 的 `custom_exception_handler` 掛在 `REST_FRAMEWORK["EXCEPTION_HANDLER"]`，把所有 DRF 錯誤包成單一信封：

```json
{ "error": { "code": "validation_error", "message": "...", "detail": {...}, "request_id": "abc123" } }
```

- `code`：HTTP status → 機器碼對照（`bad_request`/`not_authenticated`/`permission_denied`/`not_found`/`conflict`/`throttled`/`server_error`…）。
- `request_id`：對照 log / Sentry。
- **非 DRF 例外（真正的 500）不在這裡吞**，往上拋給 Django，由 Sentry / log 捕捉。

前端只需處理這一種形狀。

---

## 7. 健康檢查

`common/views.py`，掛在 `/healthz/`。

| 端點 | 檢查 | 用途 |
|------|------|------|
| `/healthz/live/` | 只回 `{"status":"ok","environment":...}`，不碰相依服務 | Caddy / liveness（便宜） |
| `/healthz/ready/` | DB(`SELECT 1`)、Redis(ping)、各 queue 長度、必要 worker；任一不健康回 **503** | compose healthcheck、`deploy.sh` 部署閘門 |

`ready` 回傳 `checks`（各項 ok/fail/skipped）與 `metrics`（queue 長度、線上 worker、DB pool 狀態）。worker 是否在線靠 Celery 寫進 cache 的心跳判斷（見 [CELERY.md](CELERY.md)），由 `CELERY_REQUIRED_WORKERS` 指定哪些必須在線。

---

## 8. 可觀測性 / 結構化 Logging

`config/logging_utils.py` + `settings/base.py` 的 `LOGGING`：

- **stdout**：保留完整 log stream，交給 Docker / log collector 查全量脈絡。
- **檔案留存**：`WARNING` 以上另寫到 `backend/logs/errors/<env>-<service>.log`，方便 stage/prod 事故後快速 grep。

### 格式

| `LOG_FORMAT` | 用途 | 內容 |
|------|------|------|
| `console` | 本機可讀 | `時間 LEVEL [service] (request_id task_name task_id) logger: message` |
| `json` | stage/prod | `ts`/`level`/`service`/`env`/`logger`/`request_id`/`module`/`func`/`line`/`message` + 例外/堆疊 |

預設依環境自動切（dev=console、stage/prod=json）。

### 關聯 ID 串接（HTTP → Celery 同一條 request_id）

- contextvar：`request_id_var` / `task_id_var` / `task_name_var`（跨 async/sync/process）。
- HTTP：`RequestIDMiddleware` 注入 `request_id`。
- Celery：`before_task_publish` 把發任務當下的 `request_id` 塞進任務 header；`task_prerun` 在 worker 端綁回 `request_id` + `task_id` + `task_name`。因此「API 請求 → 背景任務」可用同一個 `request_id` 串成一條線（見 [CELERY.md](CELERY.md)）。
- `RequestContextFilter` 把這些注入每筆 log record。

### 自訂結構化欄位

`logger.info("...", extra={"item_id": 42})` 的欄位會**自動透傳**進 JSON log（`JsonFormatter` 篩掉標準屬性、把剩下的塞進 payload）。

### 其他

- `LOG_SERVICE_NAME`：每個 process 各自具名（compose 設 `web`/`worker-default`/…），JSON log 可分辨來源。
- `LOG_ERROR_FILE_ENABLED`：是否啟用 warning/error 檔案留存（預設 test 關閉，其餘環境開啟）。
- `LOG_ERROR_RETENTION_DAYS`：檔案每日輪替後保留天數（預設 30）。
- `LOG_ERROR_DIR`：檔案留存目錄，預設 `backend/logs/errors`；stage/prod compose 會掛到 host 的 `./backend/logs`。
- 請求延遲：`performance.request` logger（見 middleware）。
- 健康：`performance.health` logger（not ready 時記 warning）。
- **Sentry**：設 `SENTRY_DSN` 即啟用（Django + Celery integration、`send_default_pii=False`、靠 request_id 對照）；留空完全不啟用。

---

## 9. 儲存

dev/stage/prod 的 media 與 static 對照表見 [ARCHITECTURE.md](ARCHITECTURE.md) 的「儲存策略」。本節只談後端實作：

- `common/storage.py` 的 `AutoCreateAzureStorage`：容器不存在時自動建立，首次部署方便；缺套件 / 權限不足不阻斷啟動，由 `storage_smoke_test` 實測。
- `deploy.sh` 的儲存閘門強制 stage/prod 用 Azure 且 prod≠stage 帳號，並實跑 `storage_smoke_test`（見 [INFRASTRUCTURE.md](INFRASTRUCTURE.md)）。
- 日後要向量檢索：把 DB image 換 `pgvector/pgvector:pg16` 並建 extension 即可。

---

## 10. API 版本化與 OpenAPI

- 業務端點都掛 `/api/v1/`（`config/urls.py` 的 `api_v1_patterns`）；不相容變更開 `v2`。
- **OpenAPI 為單一來源**（drf-spectacular）：`/api/schema/`（機器）、`/api/docs/`（Swagger UI）。前端型別對齊它。
- SPA fallback：非 `api`/`admin`/`healthz`/`static`/`media` 的路徑都回 `frontend/dist/index.html`（client-side routing）。

端點清單見 [API.md](API.md)。
</content>
