from django.contrib import admin
from django.contrib.admin.sites import NotRegistered
from django.contrib.auth.admin import GroupAdmin as BaseGroupAdmin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.contrib.auth.models import Group
from unfold.admin import ModelAdmin
from unfold.forms import AdminPasswordChangeForm, UserChangeForm, UserCreationForm

from .models import CustomerProfile, StaffProfile, User

try:
    admin.site.unregister(Group)
except NotRegistered:
    pass


@admin.register(User)
class UserAdmin(BaseUserAdmin, ModelAdmin):
    form = UserChangeForm
    add_form = UserCreationForm
    change_password_form = AdminPasswordChangeForm
    list_display = ["username", "display_name", "phone", "role", "is_staff", "is_active"]
    list_filter = ["role", "is_staff", "is_active", "is_superuser", "groups"]
    search_fields = ["username", "phone", "display_name", "email"]
    fieldsets = BaseUserAdmin.fieldsets + (
        ("寶傑帳號資訊", {"fields": ("display_name", "phone", "role")}),
    )


@admin.register(Group)
class GroupAdmin(BaseGroupAdmin, ModelAdmin):
    pass


@admin.register(CustomerProfile)
class CustomerProfileAdmin(ModelAdmin):
    list_display = ["user", "city", "dist", "pkg_remaining", "pkg_total", "manual", "onboarded"]
    list_filter = ["city", "dist", "manual", "onboarded"]
    search_fields = ["user__display_name", "user__phone", "addr"]
    autocomplete_fields = ["user"]
    readonly_fields = ["created_at", "updated_at"]
    list_per_page = 30
    fieldsets = (
        ("帳號", {"fields": ("user",)}),
        ("服務地址", {"fields": ("city", "dist", "addr")}),
        ("套組次數", {"fields": ("pkg_remaining", "pkg_total")}),
        ("家庭環境", {"fields": ("has_pets", "has_baby", "allergy")}),
        ("通知偏好", {"fields": ("notify_push", "notify_sms")}),
        ("狀態", {"fields": ("onboarded", "manual", "created_at", "updated_at")}),
    )


@admin.register(StaffProfile)
class StaffProfileAdmin(ModelAdmin):
    list_display = ["user", "status", "rating"]
    list_filter = ["status"]
    search_fields = ["user__display_name", "user__phone"]
    autocomplete_fields = ["user", "areas"]
    filter_horizontal = ["areas"]
    readonly_fields = ["rating", "created_at", "updated_at"]
    list_per_page = 30
    fieldsets = (
        ("帳號", {"fields": ("user",)}),
        ("狀態與評分", {"fields": ("status", "rating")}),
        ("服務區（決定自動派工）", {"fields": ("areas",)}),
        ("系統資訊", {"fields": ("created_at", "updated_at")}),
    )
