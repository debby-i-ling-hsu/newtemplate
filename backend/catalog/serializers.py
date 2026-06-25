from rest_framework import serializers

from .models import Service, ServicePackage


class ServiceSerializer(serializers.ModelSerializer):
    class Meta:
        model = Service
        fields = ["id", "name", "desc", "price", "duration", "is_base", "is_addon"]


class ServicePackageSerializer(serializers.ModelSerializer):
    unit_price = serializers.IntegerField(read_only=True)

    class Meta:
        model = ServicePackage
        fields = ["id", "name", "total", "price", "unit_price"]
