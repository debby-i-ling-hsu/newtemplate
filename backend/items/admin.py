from django.contrib import admin
from unfold.admin import ModelAdmin

from .models import Item


@admin.register(Item)
class ItemAdmin(ModelAdmin):
    list_display = ["id", "name", "owner", "is_done", "created_at"]
    list_filter = ["is_done", "created_at"]
    search_fields = ["name", "description"]
    autocomplete_fields = ["owner"]
    readonly_fields = ["created_at", "updated_at"]
    date_hierarchy = "created_at"
    list_per_page = 30
    fieldsets = (
        ("基本資料", {"fields": ("name", "description", "is_done")}),
        ("歸屬與系統資訊", {"fields": ("owner", "created_at", "updated_at")}),
    )
