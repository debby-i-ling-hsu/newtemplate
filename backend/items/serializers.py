from rest_framework import serializers

from .models import Item


class ItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = Item
        fields = ["id", "name", "description", "is_done", "created_at", "updated_at"]
        read_only_fields = ["id", "created_at", "updated_at"]
