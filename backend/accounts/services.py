"""帳號 / 認證商業邏輯層。

App 端登入採「手機 + OTP」。本專案為展示原型，OTP 為**模擬**：不真的發簡訊，
驗證碼固定為 settings.DEMO_OTP_CODE（預設 000000）。客戶第一次驗證即自助註冊。
"""

from __future__ import annotations

from django.conf import settings
from django.contrib.auth import get_user_model
from django.db import transaction
from rest_framework_simplejwt.tokens import RefreshToken

from .models import CustomerProfile, Role

User = get_user_model()

DEMO_OTP_CODE = getattr(settings, "DEMO_OTP_CODE", "000000")


def verify_otp_code(code: str) -> bool:
    """模擬驗證：固定碼。真實串接簡訊商時改這裡（查 cache 內的一次性碼）。"""
    return code == DEMO_OTP_CODE


@transaction.atomic
def get_or_create_customer(*, phone: str, display_name: str = "") -> tuple[User, bool]:
    """以手機號碼取得使用者；不存在則自助建立為客戶（密碼設為 unusable）。

    回傳 (user, created)。已存在的業務 / 行政帳號照其原角色登入，不會被改成客戶。
    """
    user = User.objects.filter(phone=phone).first()
    if user is not None:
        return user, False

    user = User(
        username=phone,
        phone=phone,
        role=Role.CUSTOMER,
        display_name=display_name or "",
    )
    user.set_unusable_password()
    user.save()
    CustomerProfile.objects.create(user=user)
    return user, True


def issue_tokens(user: User) -> dict[str, str]:
    """核發 JWT（access + refresh）。"""
    refresh = RefreshToken.for_user(user)
    return {"access": str(refresh.access_token), "refresh": str(refresh)}
