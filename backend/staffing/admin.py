from django.contrib import admin
from unfold.admin import ModelAdmin

from .models import ServiceArea, StaffSchedule


@admin.register(ServiceArea)
class ServiceAreaAdmin(ModelAdmin):
    list_display = ["city", "district"]
    list_filter = ["city"]
    search_fields = ["city", "district"]
    list_per_page = 50


@admin.register(StaffSchedule)
class StaffScheduleAdmin(ModelAdmin):
    list_display = ["staff", "month", "submitted", "updated_at"]
    list_filter = ["month", "submitted"]
    search_fields = ["staff__display_name", "staff__phone"]
    autocomplete_fields = ["staff"]
    readonly_fields = ["created_at", "updated_at"]
