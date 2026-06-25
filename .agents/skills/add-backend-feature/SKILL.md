---
name: add-backend-feature
description: 在後端新增或修改一個功能（Django app）。當使用者要新增、刪除、修改資料模型、API 端點、CRUD 功能、或「後端加一個 X」時使用。除非使用者明確說只改後端，API 變更後要同步 Web 與 Mobile 介面。
---

# 新增後端功能

照既有 `items` app 的結構複製。**先讀 `backend/items/`** 當範本，再依樣建立新 app。

## 跨介面要求

- 後端 API、serializer、validation、權限、狀態流程有新增、刪除、修改時，預設要同步 `frontend/` 與 `mobile/` 的 API 型別、hooks、表單、列表/詳情畫面與測試。
- 只有使用者明確說「只改後端」時，才可以不動 Web/Mobile；回報時仍要標明 Web/Mobile 未同步以及原因。
- 新增完整產品功能時，不要只停在 API；要接著使用 `add-frontend-page` 與 `add-mobile-feature` 完成兩個正式 client。

## 後台要求

- 需要案主/營運管理的資料，一律在 Django Admin 提供後台，不另外做 React 後台。
- `admin.py` 的 ModelAdmin 一律繼承 `unfold.admin.ModelAdmin`。
- Admin 介面給非工程師案主使用：app/model 分群、fieldsets、actions、欄位標題、help text 以繁體中文為主，流程要照案主工作方式分區。
- 每個重要 model 至少設定 `list_display`、`search_fields`、`list_filter`、`date_hierarchy` 或合理替代；大量關聯使用 `autocomplete_fields`，系統欄位設 `readonly_fields`。
- 不要加入破壞 django-unfold RWD 的客製 CSS/JS；後台標題使用 `APP_NAME` / `ADMIN_SITE_*`。

## 步驟

1. **建立 app 目錄** `backend/<feature>/`，含這些檔案（可直接複製 `items/` 後改名）：
   - `__init__.py`、`apps.py`（`name = "<feature>"`）
   - `models.py`：繼承 `common.models.TimeStampedModel`；屬於使用者的資料要有 `owner = ForeignKey(settings.AUTH_USER_MODEL, ...)`。
   - `serializers.py`：`ModelSerializer`，`read_only_fields` 至少含 `id, created_at, updated_at`。
   - `services.py`：**商業邏輯寫這裡**，不要寫進 view。函式以 keyword-only 參數（`*,`）為主，回傳 model/queryset。
   - `views.py`：DRF `ViewSet`/`APIView`，只做 HTTP；`get_queryset` 用 `services`，並以 `request.user` 過濾資料（避免越權）。
   - `urls.py`：用 `DefaultRouter` 或 `path`。
   - `admin.py`、`tests.py`、`migrations/__init__.py`。

2. **註冊 app**：把 `"<feature>"` 加到 `backend/config/settings/base.py` 的 `LOCAL_APPS`。

3. **掛 URL**：在 `backend/config/urls.py` 加 `path("api/<feature>/", include("<feature>.urls"))`，放在 SPA fallback 的 `re_path` 之前。

4. **產生 migration**：`make dev-makemigrations`（或在 web 容器內 `python manage.py makemigrations <feature>`）。**migration 檔要進版控**，不要手改。

5. **寫 Admin**：用 `unfold.admin.ModelAdmin` 建立案主可用的後台：繁中分區、列表欄位、搜尋、篩選、日期導覽、關聯 autocomplete、readonly 系統欄位。參考 `backend/items/admin.py`。

6. **寫測試**：至少涵蓋「建立並列出自己的資料」「不能存取他人資料（404）」「未登入回 401」。參考 `backend/items/tests.py`。

7. **驗證**：跑 run-checks skill（`make backend-check`、`make backend-test`）。若同步 Web/Mobile，也要跑前端檢查與 `make mobile-check`。healthz 要維持綠燈。

## 上線前檢查清單（★ 寫完功能逐條過，完整版見 `docs/PRINCIPLES.md`）

- [ ] **並發**：有讀-改-寫（庫存/餘額/狀態）嗎？要用 `transaction.atomic()` + `select_for_update()`，數值增減用 `F()`。範本：`items/services.py` 的 `complete_item()`。
- [ ] **可重試**：這操作被呼叫兩次（雙擊/重送/重試）安全嗎？扣款/建立型要 idempotent。
- [ ] **效能**：list 有沒有 N+1（加 `select_related`/`prefetch_related`）？有分頁嗎？常用 filter 欄位加索引了嗎？
- [ ] **背景任務**：慢的或打外部 API 的工作丟 Celery 了嗎？任務 idempotent + 有重試 + 傳 ID？範本：`items/tasks.py`。
- [ ] **資安**：queryset 用 `request.user` 過濾？owner/price/role 等權威欄位由後端設定、沒信任前端？
- [ ] **可演進**：migration 在滾動部署下安全（新欄位可空/有預設）？破壞性變更分多次？

不適用的條目，在回報時說明為什麼略過——不要默默跳過。

## 禁止
- 不要把商業邏輯塞進 view 或 serializer。
- 不要手寫/手改 migration 檔。
- 不要回傳未經 `owner` 過濾的 queryset。
- 不要在 DB 交易（`atomic`）裡呼叫外部 API（副作用交給 Celery 任務）。
