from django.contrib import admin
from django.contrib.admin.sites import NotRegistered
from django.contrib.auth.admin import GroupAdmin as BaseGroupAdmin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.contrib.auth.models import Group
from unfold.admin import ModelAdmin
from unfold.forms import AdminPasswordChangeForm, UserChangeForm, UserCreationForm

from .models import User

try:
    admin.site.unregister(Group)
except NotRegistered:
    pass


@admin.register(User)
class UserAdmin(BaseUserAdmin, ModelAdmin):
    form = UserChangeForm
    add_form = UserCreationForm
    change_password_form = AdminPasswordChangeForm
    list_display = ["username", "email", "display_name", "is_staff", "is_active"]
    list_filter = ["is_staff", "is_active", "is_superuser", "groups"]
    search_fields = ["username", "email", "display_name"]
    fieldsets = BaseUserAdmin.fieldsets + (("案主顯示資訊", {"fields": ("display_name",)}),)


@admin.register(Group)
class GroupAdmin(BaseGroupAdmin, ModelAdmin):
    pass
