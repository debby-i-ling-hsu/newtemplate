from django.core.exceptions import ValidationError
from django.db import models

from common.models import TimeStampedModel


class Service(TimeStampedModel):
    """服務項目（基礎 SKU 或加購）。由行政在後台維護，客戶 App 唯讀取用。"""

    name = models.CharField("名稱", max_length=100)
    desc = models.CharField("描述", max_length=200, blank=True)
    price = models.PositiveIntegerField("單價（NT$）", default=0)
    duration = models.PositiveIntegerField("預設時長（分鐘）", default=60)
    is_base = models.BooleanField("基礎 SKU", default=False)
    is_addon = models.BooleanField("加購項目", default=False)
    active = models.BooleanField("啟用", default=True)

    class Meta:
        verbose_name = "服務項目"
        verbose_name_plural = "服務項目"
        ordering = ["-is_base", "name"]

    def __str__(self) -> str:
        return self.name


class ServicePackage(TimeStampedModel):
    """套組方案（多次數預付）。金額為試算，未含金流。"""

    name = models.CharField("名稱", max_length=100)
    total = models.PositiveIntegerField("總次數", default=8)
    price = models.PositiveIntegerField("售價（NT$）", default=0)
    active = models.BooleanField("啟用", default=True)

    class Meta:
        verbose_name = "套組方案"
        verbose_name_plural = "套組方案"
        ordering = ["price"]

    def __str__(self) -> str:
        return self.name

    @property
    def unit_price(self) -> int:
        return round(self.price / self.total) if self.total else 0


class Promotion(TimeStampedModel):
    class Kind(models.TextChoices):
        AMOUNT = "amount", "折抵金額"
        PERCENT = "percent", "折抵百分比"
        BONUS = "bonus", "加贈次數"
        FREE_TRIAL = "free_trial", "免費試用"

    name = models.CharField("名稱", max_length=100)
    kind = models.CharField("優惠類型", max_length=20, choices=Kind.choices)
    value = models.IntegerField("優惠值", default=0)
    active = models.BooleanField("啟用", default=True)

    class Meta:
        verbose_name = "優惠活動"
        verbose_name_plural = "優惠活動"
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return self.name


class PayrollSetting(models.Model):
    """薪資參數（單例）。完工計酬以此車馬費為單一依據。"""

    travel_fee = models.PositiveIntegerField("車馬費（每場完工 NT$）", default=400)
    updated_at = models.DateTimeField("更新時間", auto_now=True)

    class Meta:
        verbose_name = "薪資參數"
        verbose_name_plural = "薪資參數"

    def __str__(self) -> str:
        return f"車馬費 NT$ {self.travel_fee}"

    def save(self, *args, **kwargs):
        if not self.pk and PayrollSetting.objects.exists():
            raise ValidationError("薪資參數為單例，請編輯既有設定。")
        self.pk = 1
        super().save(*args, **kwargs)

    @classmethod
    def current(cls) -> "PayrollSetting":
        obj, _ = cls.objects.get_or_create(pk=1)
        return obj
