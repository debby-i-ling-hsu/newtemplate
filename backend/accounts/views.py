from drf_spectacular.utils import extend_schema
from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView

from . import services
from .models import CustomerProfile
from .serializers import (
    MeUpdateSerializer,
    OtpRequestSerializer,
    OtpVerifySerializer,
    UserSerializer,
)


class OtpRequestView(APIView):
    """請求 OTP（模擬，不真的發簡訊）。回 200 並提示測試碼。"""

    permission_classes = [permissions.AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "login"

    @extend_schema(request=OtpRequestSerializer, responses={200: None})
    def post(self, request):
        serializer = OtpRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        # 真實串接簡訊商時：產生一次性碼、寫入 cache、寄送簡訊。此處為模擬。
        return Response({"detail": "驗證碼已發送（測試環境固定 000000）", "demo_code": "000000"})


class OtpVerifyView(APIView):
    """驗證 OTP → 自助註冊（客戶）/ 登入，回傳 JWT 與使用者資訊。"""

    permission_classes = [permissions.AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "login"

    @extend_schema(request=OtpVerifySerializer, responses={200: UserSerializer})
    def post(self, request):
        serializer = OtpVerifySerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        if not services.verify_otp_code(data["code"]):
            return Response({"detail": "驗證碼錯誤"}, status=status.HTTP_400_BAD_REQUEST)

        user, _ = services.get_or_create_customer(
            phone=data["phone"], display_name=data.get("display_name", "")
        )
        tokens = services.issue_tokens(user)
        return Response({**tokens, "user": UserSerializer(user).data})


class MeView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    @extend_schema(responses=UserSerializer)
    def get(self, request):
        return Response(UserSerializer(request.user).data)

    @extend_schema(request=MeUpdateSerializer, responses=UserSerializer)
    def patch(self, request):
        """更新顯示名稱與客戶 profile（地址 / 家庭環境 / 通知偏好 / onboarding）。"""
        serializer = MeUpdateSerializer(data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        user = request.user
        if "display_name" in data:
            user.display_name = data["display_name"]
            user.save(update_fields=["display_name"])

        profile_fields = {
            k: v
            for k, v in data.items()
            if k
            in {
                "city",
                "dist",
                "addr",
                "has_pets",
                "has_baby",
                "allergy",
                "notify_push",
                "notify_sms",
                "onboarded",
            }
        }
        if profile_fields:
            profile, _ = CustomerProfile.objects.get_or_create(user=user)
            for k, v in profile_fields.items():
                setattr(profile, k, v)
            profile.save()

        return Response(UserSerializer(user).data)
