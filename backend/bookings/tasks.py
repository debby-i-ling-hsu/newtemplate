"""預約相關背景任務（模擬推播通知）。照 items/tasks.py 骨架，僅記 log。

真實情境會在這裡呼叫推播 / 簡訊服務；本專案為展示原型，故只記錄。
"""

import logging

from celery import shared_task

logger = logging.getLogger(__name__)

EVENT_LABELS = {
    "created": "預約成功通知",
    "completed": "完工邀評通知",
    "abandoned": "棄單補單推播",
}


@shared_task(
    bind=True,
    queue="default",
    autoretry_for=(Exception,),
    retry_backoff=True,
    retry_backoff_max=600,
    retry_jitter=True,
    max_retries=5,
    acks_late=True,
)
def send_booking_notification(self, booking_id: int, event: str):
    """模擬推播。傳 ID 不傳物件；idempotent（重跑只記 log，不產生重複副作用）。"""
    from .models import Booking

    booking = Booking.objects.filter(id=booking_id).first()
    if booking is None:
        logger.warning("booking %s 不存在，略過通知", booking_id)
        return
    logger.info(
        "模擬推播：%s",
        EVENT_LABELS.get(event, event),
        extra={"booking_id": booking_id, "event": event},
    )
