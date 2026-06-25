from rest_framework import serializers

from .models import ServiceArea, StaffSchedule


class ServiceAreaSerializer(serializers.ModelSerializer):
    class Meta:
        model = ServiceArea
        fields = ["id", "city", "district"]


class StaffScheduleSerializer(serializers.ModelSerializer):
    class Meta:
        model = StaffSchedule
        fields = ["id", "month", "slots", "submitted"]
        read_only_fields = ["id"]
