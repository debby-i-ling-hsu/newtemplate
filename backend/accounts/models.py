from django.contrib.auth.models import AbstractUser
from django.db import models

from common.models import TimeStampedModel


class Role(models.TextChoices):
    """系統角色。客戶自助註冊；業務 / 行政由行政在 Django Admin 開通並指派。"""

    CUSTOMER = "customer", "客戶"
    TECHNICIAN = "technician", "業務"
    ADMIN = "admin", "行政"


class User(AbstractUser):
    """自訂 User。

    本專案 App 端一律用「手機號碼 + OTP」登入（見 accounts.services），
    OTP 建立的使用者 username = phone；行政帳號另保留密碼供 Django Admin 登入。
    role 決定登入後進客戶 App 或業務 App。
    """

    display_name = models.CharField("顯示名稱", max_length=150, blank=True)
    phone = models.CharField("手機號碼", max_length=20, unique=True, null=True, blank=True)
    role = models.CharField(
        "角色", max_length=20, choices=Role.choices, default=Role.CUSTOMER, db_index=True
    )

    def __str__(self) -> str:
        return self.display_name or self.get_username()

    @property
    def is_customer(self) -> bool:
        return self.role == Role.CUSTOMER

    @property
    def is_technician(self) -> bool:
        return self.role == Role.TECHNICIAN


class CustomerProfile(TimeStampedModel):
    """客戶的服務相關資料（地址、套組次數、家庭環境、通知偏好）。"""

    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="customer_profile")
    city = models.CharField("縣市", max_length=20, blank=True)
    dist = models.CharField("行政區", max_length=20, blank=True)
    addr = models.CharField("詳細地址", max_length=200, blank=True)
    pkg_remaining = models.PositiveIntegerField("套組剩餘次數", default=0)
    pkg_total = models.PositiveIntegerField("套組總次數", default=0)
    has_pets = models.BooleanField("家中有寵物", default=False)
    has_baby = models.BooleanField("家中有嬰幼兒", default=False)
    allergy = models.CharField("過敏 / 特殊備註", max_length=200, blank=True)
    notify_push = models.BooleanField("推播通知", default=True)
    notify_sms = models.BooleanField("簡訊通知", default=True)
    onboarded = models.BooleanField("已完成新手引導", default=False)
    manual = models.BooleanField("行政代建", default=False)

    class Meta:
        verbose_name = "客戶資料"
        verbose_name_plural = "客戶資料"

    def __str__(self) -> str:
        return f"{self.user.display_name or self.user.phone} 的客戶資料"

    @property
    def full_address(self) -> str:
        return f"{self.city}{self.dist}{self.addr}"


class StaffStatus(models.TextChoices):
    ONLINE = "online", "在線"
    BANNED = "banned", "禁牌中"
    DISABLED = "disabled", "停用"


class StaffProfile(TimeStampedModel):
    """業務（師傅）的狀態、評分與服務區。服務區決定自動派工。"""

    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="staff_profile")
    rating = models.DecimalField("平均評分", max_digits=3, decimal_places=1, default=5)
    status = models.CharField(
        "狀態", max_length=20, choices=StaffStatus.choices, default=StaffStatus.ONLINE
    )
    areas = models.ManyToManyField(
        "staffing.ServiceArea", related_name="staff", blank=True, verbose_name="服務區"
    )

    class Meta:
        verbose_name = "業務資料"
        verbose_name_plural = "業務資料"

    def __str__(self) -> str:
        return f"{self.user.display_name or self.user.phone} 的業務資料"
