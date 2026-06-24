# 非同步任務（Celery）技術參考

Celery 的完整實作細節：app 設定、佇列與 worker、可靠性旗標、log 串接、健康心跳、beat、任務衛生、如何新增佇列。
程式碼在 `backend/config/celery.py`、`backend/config/settings/base.py`、`backend/items/tasks.py`、`backend/entrypoints/`。

---

## 1. 元件總覽

```
web ──(.delay)──▶ Redis broker ──▶ worker-default      (Q: default)
                       │           worker-maintenance  (Q: maintenance)
                       │           worker-long-running  (Q: long_running)
                       └─────────  beat（DatabaseScheduler，排程入列）
```

- **broker**：Redis db 0（`CELERY_BROKER_URL`）。
- **result backend**：Redis db 1（`CELERY_RESULT_BACKEND`）。
- **cache**（worker 心跳、限流計數）：Redis db 3（`CACHE_URL`）。
- 三條通用佇列各自一個獨立 worker，互不搶資源。
- `beat` 跑 `DatabaseScheduler`，排程存 DB（`django-celery-beat`），可在 Admin 改排程。

---

## 2. App 設定（`config/celery.py`）

```python
app = Celery("fullstackapp")
app.config_from_object("django.conf:settings", namespace="CELERY")
app.autodiscover_tasks()

app.conf.update(
    task_acks_late=True,             # 成功處理後才 ack，避免任務遺失
    task_reject_on_worker_lost=True, # worker 意外中止時重新入隊
    worker_prefetch_multiplier=1,    # 每次只預取 1 個，避免記憶體暴衝 / 隊頭阻塞
    task_track_started=True,         # 可監控任務進度
)
```

`settings/base.py` 的 Celery 設定：

| 設定 | 值 | 說明 |
|------|----|------|
| `CELERY_TASK_SERIALIZER` / `RESULT_SERIALIZER` / `ACCEPT_CONTENT` | json | 一律 JSON，不用 pickle |
| `CELERY_TIMEZONE` | `TIME_ZONE`（Asia/Taipei） | |
| `CELERY_TASK_DEFAULT_QUEUE` | `default` | |
| `CELERY_TASK_QUEUES` | `default`/`maintenance`/`long_running` | 三條通用佇列 |
| `CELERY_BEAT_SCHEDULER` | `DatabaseScheduler` | 排程存 DB |
| `CELERY_TASK_SOFT_TIME_LIMIT` | 600 | 軟逾時（秒），拋 `SoftTimeLimitExceeded` |
| `CELERY_TASK_TIME_LIMIT` | 900 | 硬逾時（秒），強制砍 |
| `CELERY_REQUIRED_WORKERS` | （空） | `/healthz/ready/` 要求在線的 worker |

### macOS 本機特例

```python
if sys.platform == "darwin" and DJANGO_ENV in {"dev", "test"}:
    app.conf.worker_pool = "solo"
```

macOS 的 prefork fork 在本機常出問題，dev/test 改用 solo pool。

---

## 3. 可靠性設計

| 機制 | 設定 | 為什麼 |
|------|------|--------|
| 不遺失任務 | `task_acks_late=True` | worker 成功才 ack；中途掛掉任務會重跑 |
| worker 掛掉重入隊 | `task_reject_on_worker_lost=True` | 配合 acks_late，硬中止也不遺失 |
| 不吃太多 | `worker_prefetch_multiplier=1` | 慢任務不會把一堆快任務鎖在單一 worker（隊頭阻塞） |
| 重試 | task 上設 `autoretry_for` + `retry_backoff` + `retry_jitter` + `max_retries` | 暫時性錯誤自動恢復、避免重試尖峰 |
| 逾時善後 | `soft_time_limit` → `SoftTimeLimitExceeded` | 任務有機會清理再決定是否重試 |

> 因為 `acks_late` + retry 會讓任務**重跑**，所有任務**必須 idempotent**。

### DB 連線與 fork

prefork worker 與 psycopg pool 不相容。兩道處理：

1. `config/celery.py` 的 `worker_before_create_process` / `worker_process_init` signal：fork 前後關閉 DB 連線，避免子 process 繼承到壞掉的 pool 連線。
2. `entrypoint-celery-worker.sh`：偵測 `DB_USE_POOL=True` + prefork pool 時，**對 worker 關閉 pool**（`export DB_USE_POOL=False`）。

---

## 4. Log 關聯 ID 串接（HTTP → 任務）

讓「API 請求觸發的背景任務」與原請求共用同一個 `request_id`，可在 log 串成一條線。四個 signal：

| Signal | 動作 |
|--------|------|
| `before_task_publish` | 發任務時把當下 `request_id` 塞進任務 header |
| `task_prerun` | worker 端從 header 取回 `request_id`，並綁 `task_id` + `task_name` 到 contextvar |
| `task_postrun` | 還原 contextvar |
| `setup_logging` | **阻止 Celery 用自己的格式劫持 logging**，改用 Django 的 `LOGGING`，worker 與 web log 格式一致（含 request_id） |

> `setup_logging` 這步很多專案漏掉，導致 worker log 退回 Celery 預設格式、丟失 request_id。詳見 [BACKEND.md §8](BACKEND.md)。

---

## 5. Worker 心跳與健康檢查

`config/celery.py` 在 `worker_ready` 與 `heartbeat_sent` 時把心跳寫進 cache：

```python
cache.set(f"celery:heartbeat:{hostname}", "ok", timeout=90)
```

`/healthz/ready/`（`common/views.py`）掃這些 key 判斷哪些 worker 在線，比對 `CELERY_REQUIRED_WORKERS`；缺任何一個就回 503。同時回報各 queue 長度（`client.llen(queue)`）。

stage/prod 設 `CELERY_REQUIRED_WORKERS=worker-default,worker-maintenance,worker-long-running`，部署閘門才會確認 worker 真的起來。

---

## 6. 任務衛生（`items/tasks.py` 骨架）

新增背景任務照這個複製：

```python
@shared_task(
    bind=True,
    queue="default",
    autoretry_for=(Exception,),
    retry_backoff=True, retry_backoff_max=600, retry_jitter=True,
    max_retries=5,
    acks_late=True,
)
def send_item_completed_notification(self, item_id: int):
    item = Item.objects.filter(id=item_id).first()   # 傳 ID 不傳物件
    if item is None:
        return
    try:
        ...  # 副作用（寄信 / 打第三方）；要 idempotent（重跑不重複）
    except SoftTimeLimitExceeded:
        ...  # 善後再決定是否重試
        raise
```

守則：

- **傳 ID 不傳物件**：payload 小、任務內讀到最新狀態。
- **idempotent**：acks_late / retry 會重跑，重跑不可產生重複副作用（寄信前先查「是否已寄過」）。
- **尊重 soft_time_limit**：吃到 `SoftTimeLimitExceeded` 要善後。
- **副作用在交易提交後才觸發**：service 的 atomic 區塊內不要 `.delay()` 也不要打外部 API；view 在 service 回傳「真的有變更」後才 `.delay()`（範例見 `items/views.py` 的 `complete` action）。

### 什麼工作該丟 Celery

跑 >1 秒、打外部 I/O（寄信 / 轉檔 / 第三方）、可失敗重試的。**不要**把請求路徑的延遲依賴在任務結果上——Celery 不是同步 RPC，也別假設執行順序。

---

## 7. 何時新增一條佇列 + worker

預設三條（`default` / `maintenance` / `long_running`）夠用就別拆。**只有**當某類任務的 SLA / 資源 / 失敗模式不同，且出現隊頭阻塞（慢批次卡住快的使用者任務），或需要獨立擴縮 / 優先級時才拆。

新增步驟：

1. `settings/base.py` 的 `CELERY_TASK_QUEUES` 加一條 `Queue("myqueue")`。
2. task 上 `@shared_task(queue="myqueue")`。
3. compose（dev/stage/prod）照現有 worker 複製一個 service，設 `CELERY_WORKER_QUEUES=myqueue`、`CELERY_WORKER_NAME`、`LOG_SERVICE_NAME`、`CELERY_WORKER_CONCURRENCY`。
4. 若要納入健康閘門，把新 worker 名加進 `CELERY_REQUIRED_WORKERS`。

---

## 8. Worker / Beat 啟動（entrypoints）

`entrypoint-celery-worker.sh`：先 ping broker 等它起來 → 處理 pool/DB 相容性 → 啟動：

```sh
celery -A config worker -l info --pidfile= \
  -Q "${CELERY_WORKER_QUEUES:-default}" \
  --concurrency="${CELERY_WORKER_CONCURRENCY:-2}" \
  --prefetch-multiplier="${CELERY_PREFETCH_MULTIPLIER:-1}" \
  --max-tasks-per-child="${CELERY_MAX_TASKS_PER_CHILD:-100}" \
  --hostname="${CELERY_WORKER_NAME:-worker@%h}"
```

`--max-tasks-per-child=100`：每跑 100 個任務回收子 process，防記憶體洩漏累積。

`entrypoint-celery-beat.sh`：ping broker → `celery -A config beat --scheduler django_celery_beat.schedulers:DatabaseScheduler`。

compose 用環境變數調每個 worker 的佇列 / 並發 / 名稱，見 [INFRASTRUCTURE.md](INFRASTRUCTURE.md)。

---

## 9. 排程任務（beat）

`beat` 用 `DatabaseScheduler`，排程存 DB，可在 Django Admin（django-celery-beat 提供的 Periodic Tasks）新增 / 改 / 停，不用改程式重啟。stage/prod 另有 `db-backup` 排程 sidecar（不是 Celery beat，是獨立 cron 容器），見 [DEPLOYMENT.md](DEPLOYMENT.md)。

---

## 10. 測試裡的 Celery

`settings/test.py` 設 `CELERY_TASK_ALWAYS_EAGER=True` + `EAGER_PROPAGATES=True`：任務同步執行、例外往上拋，測得到。broker/backend 用 memory。見 [TESTING.md](TESTING.md)。
</content>
