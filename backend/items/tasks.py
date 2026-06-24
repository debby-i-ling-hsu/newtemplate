"""Celery 任務範例。★ 新增背景任務時照這個骨架複製。

什麼時候該把工作丟到 Celery？
- 會跑超過約 1 秒、或會打外部 I/O（寄信、轉檔、呼叫第三方）的工作。
- 可以「失敗後重試」而非當場讓使用者等的工作。
- 不要把請求路徑的延遲依賴在任務結果上（任務不是同步 RPC）。

什麼時候該「新增一條佇列 + worker」（而不是塞進 default）？
- 當某類任務的 SLA / 資源需求 / 失敗模式不同，且發生隊頭阻塞
  （慢的批次卡住快的使用者任務），或需要獨立擴縮 / 優先級時，才拆。
- 別過早拆。先用 default / maintenance / long_running 三條；看到阻塞再分。
"""

import logging

from celery import shared_task
from celery.exceptions import SoftTimeLimitExceeded

logger = logging.getLogger(__name__)


@shared_task(
    bind=True,
    queue="default",
    autoretry_for=(Exception,),  # 暫時性錯誤自動重試
    retry_backoff=True,  # 指數退避：1s, 2s, 4s...
    retry_backoff_max=600,
    retry_jitter=True,  # 加抖動，避免大量任務同時重試造成尖峰
    max_retries=5,
    acks_late=True,  # 已是全域預設，這裡顯式表達「成功才 ack」的意圖
)
def send_item_completed_notification(self, item_id: int):
    """item 完成後的後續處理（示範用，僅記 log；真實情境可能是寄通知信）。

    任務衛生守則：
    - 傳 ID 不傳物件：payload 小，且任務內讀到的是最新狀態。
    - idempotent：本任務可能因 retry / acks_late 跑兩次，重跑不可造成重複副作用
      （例如：寄信前先檢查「是否已寄過」）。
    - 尊重 soft_time_limit：吃到 SoftTimeLimitExceeded 要善後再決定是否重試。
    """
    from .models import Item

    item = Item.objects.filter(id=item_id).first()
    if item is None:
        logger.warning("item %s 不存在，略過通知", item_id)
        return

    try:
        # 真正的副作用放這裡（寄信 / 打第三方）。示範僅記 log。
        logger.info("item 已完成，送出通知", extra={"item_id": item_id})
    except SoftTimeLimitExceeded:
        logger.error("通知 item %s 超過 soft time limit", item_id)
        raise
