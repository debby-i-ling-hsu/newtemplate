from django.contrib.auth import get_user_model
from rest_framework import serializers

from .models import CustomerProfile, StaffProfile

User = get_user_model()


class CustomerProfileSerializer(serializers.ModelSerializer):
    full_address = serializers.CharField(read_only=True)

    class Meta:
        model = CustomerProfile
        fields = [
            "city",
            "dist",
            "addr",
            "full_address",
            "pkg_remaining",
            "pkg_total",
            "has_pets",
            "has_baby",
            "allergy",
            "notify_push",
            "notify_sms",
            "onboarded",
        ]
        read_only_fields = ["pkg_remaining", "pkg_total", "full_address"]


class StaffProfileSerializer(serializers.ModelSerializer):
    areas = serializers.SerializerMethodField()

    class Meta:
        model = StaffProfile
        fields = ["rating", "status", "areas"]

    def get_areas(self, obj) -> list[str]:
        return [f"{a.city}{a.district}" for a in obj.areas.all()]


class UserSerializer(serializers.ModelSerializer):
    """登入後回傳的使用者資訊。依角色附帶對應 profile。"""

    customer_profile = CustomerProfileSerializer(read_only=True)
    staff_profile = StaffProfileSerializer(read_only=True)

    class Meta:
        model = User
        fields = [
            "id",
            "phone",
            "role",
            "display_name",
            "email",
            "date_joined",
            "customer_profile",
            "staff_profile",
        ]
        read_only_fields = fields


class OtpRequestSerializer(serializers.Serializer):
    phone = serializers.CharField(max_length=20)


class OtpVerifySerializer(serializers.Serializer):
    phone = serializers.CharField(max_length=20)
    code = serializers.CharField(max_length=10)
    display_name = serializers.CharField(max_length=150, required=False, allow_blank=True)


class MeUpdateSerializer(serializers.Serializer):
    """PATCH /me：客戶可更新顯示名稱、地址、家庭環境、通知偏好、onboarding。"""

    display_name = serializers.CharField(max_length=150, required=False)
    city = serializers.CharField(max_length=20, required=False, allow_blank=True)
    dist = serializers.CharField(max_length=20, required=False, allow_blank=True)
    addr = serializers.CharField(max_length=200, required=False, allow_blank=True)
    has_pets = serializers.BooleanField(required=False)
    has_baby = serializers.BooleanField(required=False)
    allergy = serializers.CharField(max_length=200, required=False, allow_blank=True)
    notify_push = serializers.BooleanField(required=False)
    notify_sms = serializers.BooleanField(required=False)
    onboarded = serializers.BooleanField(required=False)
