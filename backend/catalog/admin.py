from django.contrib import admin
from unfold.admin import ModelAdmin

from .models import PayrollSetting, Promotion, Service, ServicePackage


@admin.register(Service)
class ServiceAdmin(ModelAdmin):
    list_display = ["name", "kind_label", "price", "duration", "active"]
    list_filter = ["active", "is_base", "is_addon"]
    search_fields = ["name", "desc"]
    list_editable = ["price", "active"]
    list_per_page = 30
    fieldsets = (
        ("基本資料", {"fields": ("name", "desc")}),
        ("計價與時長", {"fields": ("price", "duration")}),
        ("分類與狀態", {"fields": ("is_base", "is_addon", "active")}),
    )

    @admin.display(description="類型")
    def kind_label(self, obj):
        if obj.is_base:
            return "基礎 SKU"
        if obj.is_addon:
            return "加購"
        return "其他"


@admin.register(ServicePackage)
class ServicePackageAdmin(ModelAdmin):
    list_display = ["name", "total", "price", "unit_price_display", "active"]
    list_filter = ["active"]
    search_fields = ["name"]
    list_editable = ["active"]
    readonly_fields = ["unit_price_display"]
    fieldsets = (
        ("方案", {"fields": ("name", "total", "price", "unit_price_display")}),
        ("狀態", {"fields": ("active",)}),
    )

    @admin.display(description="每次試算單價")
    def unit_price_display(self, obj):
        return f"NT$ {obj.unit_price:,}"


@admin.register(Promotion)
class PromotionAdmin(ModelAdmin):
    list_display = ["name", "kind", "value", "active"]
    list_filter = ["kind", "active"]
    search_fields = ["name"]
    list_editable = ["active"]


@admin.register(PayrollSetting)
class PayrollSettingAdmin(ModelAdmin):
    list_display = ["travel_fee", "updated_at"]

    def has_add_permission(self, request):
        # 單例：已存在就不再允許新增
        return not PayrollSetting.objects.exists()

    def has_delete_permission(self, request, obj=None):
        return False
