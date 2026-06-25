from django.conf import settings
from django.db import models

from common.models import TimeStampedModel

SLOTS = ["09:00-12:00", "12:00-15:00", "15:00-18:00", "18:00-20:00"]


class ServiceType(models.TextChoices):
    DEMO = "demo", "免費體驗"
    PACKAGE = "package", "套組服務"
    AC = "ac", "冷氣清洗"


class BookingStatus(models.TextChoices):
    PENDING = "待派工", "待派工"
    CONFIRMED = "已確認", "已確認"
    DEPARTING = "待出發", "待出發"
    ONGOING = "進行中", "進行中"
    DONE = "已完成", "已完成"
    CANCELLED = "已取消", "已取消"
    ABANDONED = "棄單", "棄單"


# 客戶 App「即將到來 / 進行中 / 已完成」分類用
ACTIVE_STATUSES = [
    BookingStatus.PENDING,
    BookingStatus.CONFIRMED,
    BookingStatus.DEPARTING,
    BookingStatus.ONGOING,
]


class Booking(TimeStampedModel):
    """一筆預約。核心閉環的起點：客戶下單 → 自動派工 → 業務完工。"""

    customer = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="bookings"
    )
    staff = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="assigned_bookings",
    )
    service_type = models.CharField("服務類型", max_length=20, choices=ServiceType.choices)
    date = models.DateField("服務日期")
    slot = models.CharField("時段", max_length=20)
    status = models.CharField(
        "狀態", max_length=10, choices=BookingStatus.choices, default=BookingStatus.CONFIRMED
    )
    # 地址快照（下單當下，避免客戶日後改地址影響歷史紀錄）
    address = models.CharField("服務地址", max_length=250, blank=True)
    has_pets = models.BooleanField("家中有寵物", default=False)
    has_baby = models.BooleanField("家中有嬰幼兒", default=False)
    note = models.CharField("備註", max_length=300, blank=True)
    # 冷氣清洗專用
    ac_type = models.CharField("冷氣類型", max_length=20, blank=True)
    units = models.PositiveIntegerField("台數", default=0)
    price = models.PositiveIntegerField("試算費用", default=0)
    auto_assigned = models.BooleanField("自動派工", default=True)

    class Meta:
        verbose_name = "預約"
        verbose_name_plural = "預約"
        ordering = ["-date", "slot"]
        indexes = [
            models.Index(fields=["customer", "status"]),
            models.Index(fields=["staff", "date"]),
            models.Index(fields=["date"]),
        ]

    def __str__(self) -> str:
        return f"#{self.pk} {self.get_service_type_display()} {self.date} {self.slot}"


class Completion(TimeStampedModel):
    """完工回報。業務送出後產生；含計酬（車馬費，模擬，不碰金流）與客戶評分。"""

    class FeeStatus(models.TextChoices):
        NONE = "-", "無"
        PENDING = "待匯出", "待匯出"
        EXPORTED = "已匯出", "已匯出"

    booking = models.OneToOneField(Booking, on_delete=models.CASCADE, related_name="completion")
    hours = models.DecimalField("服務時數", max_digits=4, decimal_places=1, default=1.5)
    items = models.JSONField("服務項目明細", default=dict, blank=True)
    cust_note = models.CharField("服務備註（客戶可見）", max_length=300, blank=True)
    internal_note = models.CharField("內部記錄（客戶看不到）", max_length=300, blank=True)
    rating = models.PositiveSmallIntegerField("客戶評分", default=0)
    comment = models.CharField("客戶留言", max_length=300, blank=True)
    fee = models.PositiveIntegerField("車馬費", default=0)
    fee_status = models.CharField(
        "計酬狀態", max_length=10, choices=FeeStatus.choices, default=FeeStatus.NONE
    )
    month = models.CharField("所屬月份（YYYY-MM）", max_length=7, db_index=True)
    signed = models.BooleanField("客戶已簽名", default=False)

    class Meta:
        verbose_name = "完工紀錄"
        verbose_name_plural = "完工紀錄"
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return f"完工 #{self.booking_id}"


class Compensation(TimeStampedModel):
    """補償服務：業務棄單時，客戶獲得一次免費補服務的記錄。"""

    customer = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="compensations"
    )
    booking = models.ForeignKey(
        Booking, on_delete=models.SET_NULL, null=True, blank=True, related_name="compensations"
    )
    reason = models.CharField("原因", max_length=200)
    redeemed = models.BooleanField("已使用", default=False)

    class Meta:
        verbose_name = "補償服務"
        verbose_name_plural = "補償服務"
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return f"{self.customer} · {self.reason}"


class OperationLog(models.Model):
    """操作歷程：誰、何時、做了什麼。由服務層寫入，後台唯讀查詢。"""

    actor = models.CharField("操作者", max_length=100)
    action = models.CharField("動作", max_length=100)
    target = models.CharField("對象", max_length=300, blank=True)
    created_at = models.DateTimeField("時間", auto_now_add=True, db_index=True)

    class Meta:
        verbose_name = "操作歷程"
        verbose_name_plural = "操作歷程"
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return f"{self.action} · {self.actor}"
