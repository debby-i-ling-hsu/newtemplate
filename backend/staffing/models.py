from django.conf import settings
from django.db import models

from common.models import TimeStampedModel


class ServiceArea(models.Model):
    """服務區（縣市 + 行政區）。業務的服務區決定客戶下單時的自動派工。"""

    city = models.CharField("縣市", max_length=20)
    district = models.CharField("行政區", max_length=20)

    class Meta:
        verbose_name = "服務區"
        verbose_name_plural = "服務區"
        ordering = ["city", "district"]
        constraints = [
            models.UniqueConstraint(fields=["city", "district"], name="uniq_service_area")
        ]

    def __str__(self) -> str:
        return f"{self.city}{self.district}"


class StaffSchedule(TimeStampedModel):
    """業務每月班表。slots 以 JSON 記錄各日各時段是否開放接單。"""

    staff = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="schedules"
    )
    month = models.CharField("月份（YYYY-MM）", max_length=7)
    slots = models.JSONField("開放時段", default=dict, blank=True)
    submitted = models.BooleanField("已提交", default=False)

    class Meta:
        verbose_name = "業務班表"
        verbose_name_plural = "業務班表"
        ordering = ["-month"]
        constraints = [
            models.UniqueConstraint(fields=["staff", "month"], name="uniq_staff_month_schedule")
        ]

    def __str__(self) -> str:
        return f"{self.staff} · {self.month}"
