# API 參考

> **單一事實來源是 OpenAPI schema**（drf-spectacular 自動產生），本文是給人看的概覽。
> - 互動文件（Swagger UI）：http://localhost:8000/api/docs/
> - 機器可讀 schema：http://localhost:8000/api/schema/
>
> 前端 / Mobile 型別對齊 schema，不要兩邊各寫一份而漂移。

---

## 通則

| 項目 | 約定 |
|------|------|
| 版本化 | 業務端點都掛 `/api/v1/`；不相容變更開 `v2`，舊版並存 |
| 認證 | JWT（SimpleJWT）；`Authorization: Bearer <access>` |
| Token 壽命 | access 預設 30 分、refresh 預設 7 天（見 [ENVIRONMENT.md](ENVIRONMENT.md)） |
| 分頁 | `PageNumberPagination`，預設 `PAGE_SIZE=20`（`?page=`） |
| 限流 | 匿名 / 使用者 / 登入三 scope（見 ENVIRONMENT.md），外加邊界 DDoS middleware |
| 資料隔離 | 屬於使用者的資源用 `request.user` 過濾；找不到回 **404**（不回 403，避免 id 枚舉） |
| 權威欄位 | `owner` 等由後端決定，不信任 client |

### 統一錯誤格式

所有 DRF 錯誤經 `config/exceptions.py` 包成：

```json
{
  "error": {
    "code": "validation_error",
    "message": "請求無法處理，請檢查輸入。",
    "detail": { "name": ["此欄位為必填。"] },
    "request_id": "abc123"
  }
}
```

`code` 機器可讀（`bad_request`/`not_authenticated`/`permission_denied`/`not_found`/`conflict`/`throttled`/`server_error`…），`request_id` 可對照 log / Sentry。前端只需處理這一種形狀。

---

## 認證 `/api/v1/accounts/`

| Method | Path | 認證 | 說明 |
|--------|------|:---:|------|
| POST | `/register/` | 公開 | 註冊；body：`username`、`email`、`display_name`、`password`（套 Django 密碼驗證） |
| POST | `/login/` | 公開 | 登入換 token；回 `{access, refresh}`；套較嚴 `login` 限流 |
| POST | `/token/refresh/` | 公開 | 用 refresh 換新 access；body：`{refresh}` |
| GET | `/me/` | 需登入 | 目前使用者：`id`、`username`、`email`、`display_name`、`date_joined` |

---

## 範例切片 `/api/v1/items/`

標準 DRF `ModelViewSet`（每位使用者只看得到自己的 items）。`Item` 欄位：`id`、`name`、`description`、`is_done`、`created_at`、`updated_at`（後三者 read-only）。

| Method | Path | 說明 |
|--------|------|------|
| GET | `/items/` | 列表（分頁）。filter `?is_done=true`；search `?search=milk`（name/description）；排序 `?ordering=-created_at`（或 `name`） |
| POST | `/items/` | 建立；`owner` 由後端設為當前使用者 |
| GET | `/items/{id}/` | 取單筆（非本人 → 404） |
| PUT/PATCH | `/items/{id}/` | 更新 |
| DELETE | `/items/{id}/` | 刪除 |
| POST | `/items/{id}/complete/` | 標記完成（**idempotent**）；狀態變更走 service 層，副作用在交易後以 Celery 背景任務觸發 |

> `items` 是「正確做法」的範本：資料隔離（`get_queryset`）、第二道權限（`IsOwner`）、商業邏輯在 `services.py`、副作用丟 Celery。加新功能照它複製，見 [AGENTS.md](../AGENTS.md)。

---

## 健康檢查（非 `/api/v1/`）

| Path | 說明 |
|------|------|
| `GET /healthz/live/` | liveness，只回 200（不碰相依服務，便宜）。給 Caddy / LB |
| `GET /healthz/ready/` | readiness，檢查 DB / Redis / queue / 必要 worker；不健康回 503。給 compose healthcheck 與部署閘門 |

設計理由見 [ARCHITECTURE.md](ARCHITECTURE.md)。
</content>
