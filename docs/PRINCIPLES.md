# 生產原則（上線前必須想到的事）

> 這份是**鐵則清單**，給 AI Agent 與工程師在「長新功能」時逐條檢查。
> VibeCoding 最常見的坑不是「做不出來」，而是做出來「能 demo、但一上線就出事」：
> 沒想到並發、一致性、資安、可維護、可運維。**功能能跑 ≠ 可以上線。**
>
> 用法：每加一個功能，對照下面每一節問自己一次。AGENTS.md 的核心原則是摘要，
> 這裡是「為什麼」與「怎麼做」。範例 code 在 `backend/items/`、`backend/common/`。

---

## 1. 併發與資料一致性（最容易被忽略，後果最嚴重）

> 單人點一下沒事；100 個人同時點、或同一個人手殘點兩下，資料就壞了。

- **讀-改-寫一定要鎖或用原子運算。** 任何「先讀出目前值 → 算 → 寫回」的操作（扣庫存、加餘額、改狀態），在並發下會 race。兩種正解：
  - 數值增減 → 用 DB 端原子運算 `F()`：`Account.objects.filter(id=x).update(balance=F("balance") - 100)`。
  - 需要先讀值再決策 → `transaction.atomic()` + `select_for_update()` 鎖住該列。
  - 範本見 `items/services.py` 的 `complete_item()`。
- **金錢 / 庫存 / 計數操作一律包在 `transaction.atomic()`。** 多張表的寫入要嘛全成功、要嘛全回滾，不能寫一半。
- **有副作用的操作必須 idempotent（可安全重試）。** 使用者會雙擊、網路會逾時重送、Celery `acks_late` 會重跑。對「建立型 / 扣款型」操作，接受客戶端帶的 **`Idempotency-Key`**，用它去重：

  ```python
  # 同一把 key 只會成功建立一次；重送回傳同一筆結果
  obj, created = Payment.objects.get_or_create(
      idempotency_key=key, defaults={...},
  )
  if not created:
      return existing_result(obj)
  ```

- **不要在 DB 交易裡呼叫外部 API。** 交易會一直握著鎖/連線，外部一慢就拖垮全部。正解：交易內只寫 DB，提交後再用 Celery 任務打外部（必要時用 outbox pattern 確保「DB 改了就一定會送出」）。
- **Webhook / 金流 callback**：先驗簽章 → 快速回 200 → 真正處理丟背景，且處理要 idempotent（金流商會重送）。

## 2. 效能（隨資料量成長才會爆，demo 時看不出來）

- **List 端點必防 N+1。** 有關聯就 `select_related`（FK/O2O）/ `prefetch_related`（M2M/反向）。一個列表頁打出 100 條 SQL 是預設會發生的事，不是意外。
- **List 端點一律分頁**（本模板已預設 `PageNumberPagination`，`PAGE_SIZE=20`）。永遠不要回傳無上限的 queryset。
- **常用來 filter / order 的欄位要加索引**（`db_index=True` 或 `Meta.indexes` 複合索引）。FK 會自動建索引；你常 `?status=...&ordering=-created_at` 的欄位要自己加。
- **大量資料掃描**用 `.iterator()`、只取需要的欄位用 `.only()` / `.values()`，別把整個 queryset 拉進記憶體。
- **讀多寫少的昂貴查詢**用 Redis 快取，並想清楚**失效策略**（寧可短 TTL，也別留髒資料）。

## 3. Celery / 非同步（什麼時候用、什麼時候拆）

- **什麼工作該丟背景**：跑 >1 秒、打外部 I/O（寄信、轉檔、第三方）、可失敗重試的。**不要**讓請求路徑同步等任務結果。
- **什麼時候新增一條佇列 + worker**：當某類任務的 SLA / 資源 / 失敗模式不同，且出現**隊頭阻塞**（慢的批次把快的使用者任務卡住），或需要獨立擴縮 / 優先級時，才拆。**別過早拆**——先用 `default` / `maintenance` / `long_running`，觀察到阻塞再分。
- **任務衛生**（照抄 `items/tasks.py` 骨架）：
  - 傳 **ID 不傳物件**（payload 小、讀到最新狀態）。
  - **idempotent**（acks_late / retry 會重跑）。
  - `autoretry_for` + `retry_backoff` + `retry_jitter` + `max_retries`（暫時性錯誤自己恢復、避免重試尖峰）。
  - 設 `soft_time_limit`，吃到 `SoftTimeLimitExceeded` 要善後。
- **不要把 Celery 當同步 RPC**，也不要假設任務的執行順序。

## 4. 資安

- **權限走物件層級。** 屬於使用者的資料一律在 `get_queryset()` 用 `request.user` 過濾；detail 再加物件權限當第二道防線（`common/permissions.py` 的 `IsOwner`）。找不到別人的資源回 **404 不回 403**，避免用 id 枚舉。
- **永遠不信任客戶端送來的權威欄位**（`owner`、`price`、`role`、`is_staff`…），這些一律後端決定（範例：`perform_create(owner=request.user)`）。
- **祕密只放環境變數**，給 DB / 儲存最小權限帳號，定期輪替。
- **認證端點要限流**（本模板：登入套 `ScopedRateThrottle` scope=`login` + 邊界 DDoS middleware 雙層）。
- **上傳檔要驗**型別、大小、實際內容；使用者內容用獨立網域 / 簽名 URL 提供，別直接信任副檔名。
- **log 記 `request_id` 不記 PII**；錯誤用 Sentry 對照 `request_id`，不要把密碼 / token / 個資寫進 log。

## 5. API 契約與可維護性

- **API 版本化**（本模板：`/api/v1/`）。要做不相容變更時開 `v2`，舊客戶端不會一夜壞掉。
- **統一錯誤格式**（`config/exceptions.py`：`{"error": {code, message, detail, request_id}}`），前端只處理一種形狀。
- **OpenAPI schema 當單一來源**（drf-spectacular，`/api/schema/`、`/api/docs/`），前端型別對齊它，不要兩邊各寫一份。
- **Migration 要能在滾動部署下安全執行**（新舊版程式會同時在線一小段時間）。用 expand/contract：
  1. 先加「可空 / 有預設」的新欄位 → 部署。
  2. 回填資料、雙寫 → 部署。
  3. 最後才加 NOT NULL / 刪舊欄位。
  - **絕不**在一次部署裡做破壞性變更（改名 = 加新欄位 + 遷移 + 刪舊，分多次）。不要手改 migration。

## 6. 可觀測性與運維

- **結構化 log + `request_id` 串接**（已內建；HTTP → Celery 同一條 request_id）。
- **健康檢查分層**：`/healthz/live/`（便宜，給 LB）與 `/healthz/ready/`（查 DB/Redis/worker，給部署閘門）。
- **錯誤追蹤**：設 `SENTRY_DSN` 即啟用（已內建 Django + Celery integration）。
- **部署前自動備份 + 失敗自動回滾**（`scripts/deploy.sh`，已內建）。關鍵指標要有告警。

---

## 落地檢查清單（每加一個功能跑一遍）

- [ ] 這個操作會被並發呼叫嗎？需要 `atomic` / `select_for_update` / `F()` 嗎？
- [ ] 重複呼叫（雙擊 / 重試）安全嗎？需要 idempotency key 嗎？
- [ ] list 端點有沒有 N+1？有沒有分頁？filter 欄位有索引嗎？
- [ ] 慢的 / 打外部的工作有沒有丟 Celery？任務 idempotent + 有重試嗎？
- [ ] 資料有沒有用 `request.user` 隔離？權威欄位是不是後端決定？
- [ ] migration 在滾動部署下安全嗎（可空 / 有預設）？
- [ ] 錯誤格式統一嗎？schema 有更新嗎？
- [ ] `make backend-check && make backend-test` 綠燈、healthz 綠燈？

> 不確定某條是否適用？**適用就做、不適用在 PR/回報裡說明為什麼略過**——別默默跳過。
