import csv

from django.contrib import admin
from django.http import HttpResponse
from unfold.admin import ModelAdmin

from .models import Booking, Compensation, Completion, OperationLog


@admin.register(Booking)
class BookingAdmin(ModelAdmin):
    list_display = ["id", "date", "slot", "service_type", "customer", "staff", "status"]
    list_filter = ["status", "service_type", "date"]
    search_fields = ["customer__display_name", "customer__phone", "address"]
    autocomplete_fields = ["customer", "staff"]
    date_hierarchy = "date"
    list_per_page = 30
    readonly_fields = ["created_at", "updated_at"]
    fieldsets = (
        ("預約資訊", {"fields": ("service_type", "date", "slot", "status")}),
        ("客戶與派工", {"fields": ("customer", "staff", "auto_assigned", "address")}),
        ("家庭環境 / 備註", {"fields": ("has_pets", "has_baby", "note")}),
        ("冷氣清洗", {"fields": ("ac_type", "units", "price")}),
        ("系統資訊", {"fields": ("created_at", "updated_at")}),
    )


@admin.action(description="匯出選取的車馬費為 CSV（給會計核對，系統不撥款）")
def export_fees_csv(modeladmin, request, queryset):
    response = HttpResponse(content_type="text/csv")
    response["Content-Disposition"] = "attachment; filename=fees.csv"
    response.write("﻿")  # BOM，讓 Excel 正確顯示中文
    writer = csv.writer(response)
    writer.writerow(["月份", "業務", "客戶", "日期", "服務類型", "車馬費", "計酬狀態"])
    for c in queryset.select_related("booking", "booking__staff", "booking__customer"):
        b = c.booking
        writer.writerow(
            [
                c.month,
                b.staff.display_name if b.staff else "",
                b.customer.display_name,
                b.date,
                b.get_service_type_display(),
                c.fee,
                c.fee_status,
            ]
        )
    return response


@admin.action(description="標記車馬費為「已匯出」")
def mark_fees_exported(modeladmin, request, queryset):
    updated = queryset.filter(fee__gt=0).update(fee_status=Completion.FeeStatus.EXPORTED)
    modeladmin.message_user(request, f"已標記 {updated} 筆為已匯出。")


@admin.register(Completion)
class CompletionAdmin(ModelAdmin):
    list_display = ["booking", "staff_name", "month", "fee", "fee_status", "rating", "signed"]
    list_filter = ["fee_status", "month", "rating", "signed"]
    search_fields = ["booking__customer__display_name", "booking__staff__display_name"]
    autocomplete_fields = ["booking"]
    readonly_fields = ["created_at", "updated_at"]
    actions = [export_fees_csv, mark_fees_exported]
    list_per_page = 30
    fieldsets = (
        ("預約", {"fields": ("booking",)}),
        ("服務內容", {"fields": ("hours", "items", "signed")}),
        ("備註", {"fields": ("cust_note", "internal_note")}),
        ("評分", {"fields": ("rating", "comment")}),
        ("計酬（模擬，不碰金流）", {"fields": ("fee", "fee_status", "month")}),
        ("系統資訊", {"fields": ("created_at", "updated_at")}),
    )

    @admin.display(description="業務")
    def staff_name(self, obj):
        return obj.booking.staff.display_name if obj.booking.staff else "—"


@admin.register(Compensation)
class CompensationAdmin(ModelAdmin):
    list_display = ["customer", "reason", "redeemed", "created_at"]
    list_filter = ["redeemed", "created_at"]
    search_fields = ["customer__display_name", "reason"]
    autocomplete_fields = ["customer", "booking"]
    readonly_fields = ["created_at", "updated_at"]


@admin.register(OperationLog)
class OperationLogAdmin(ModelAdmin):
    list_display = ["created_at", "action", "actor", "target"]
    list_filter = ["action", "created_at"]
    search_fields = ["actor", "action", "target"]
    date_hierarchy = "created_at"
    list_per_page = 50

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False
