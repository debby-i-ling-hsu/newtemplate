from rest_framework import serializers

from .models import SLOTS, Booking, Compensation, Completion, ServiceType


class BookingSerializer(serializers.ModelSerializer):
    service_type_display = serializers.CharField(source="get_service_type_display", read_only=True)
    staff_name = serializers.SerializerMethodField()
    customer_name = serializers.CharField(source="customer.display_name", read_only=True)
    customer_phone = serializers.CharField(source="customer.phone", read_only=True)
    has_completion = serializers.SerializerMethodField()

    class Meta:
        model = Booking
        fields = [
            "id",
            "service_type",
            "service_type_display",
            "date",
            "slot",
            "status",
            "address",
            "has_pets",
            "has_baby",
            "note",
            "ac_type",
            "units",
            "price",
            "auto_assigned",
            "staff_name",
            "customer_name",
            "customer_phone",
            "has_completion",
            "created_at",
        ]
        read_only_fields = fields

    def get_staff_name(self, obj) -> str:
        return obj.staff.display_name if obj.staff else "待派工"

    def get_has_completion(self, obj) -> bool:
        return hasattr(obj, "completion")


class BookingCreateSerializer(serializers.Serializer):
    service_type = serializers.ChoiceField(choices=ServiceType.choices)
    date = serializers.DateField()
    slot = serializers.ChoiceField(choices=[(s, s) for s in SLOTS])
    has_pets = serializers.BooleanField(required=False, default=False)
    has_baby = serializers.BooleanField(required=False, default=False)
    note = serializers.CharField(required=False, allow_blank=True, default="")
    ac_type = serializers.CharField(required=False, allow_blank=True, default="")
    units = serializers.IntegerField(required=False, default=0, min_value=0)
    price = serializers.IntegerField(required=False, default=0, min_value=0)


class CompletionSerializer(serializers.ModelSerializer):
    service_type = serializers.CharField(source="booking.service_type", read_only=True)
    service_type_display = serializers.CharField(
        source="booking.get_service_type_display", read_only=True
    )
    date = serializers.DateField(source="booking.date", read_only=True)
    slot = serializers.CharField(source="booking.slot", read_only=True)
    staff_name = serializers.SerializerMethodField()
    customer_name = serializers.CharField(source="booking.customer.display_name", read_only=True)

    class Meta:
        model = Completion
        fields = [
            "id",
            "booking",
            "service_type",
            "service_type_display",
            "date",
            "slot",
            "staff_name",
            "customer_name",
            "hours",
            "items",
            "cust_note",
            "rating",
            "comment",
            "fee",
            "fee_status",
            "month",
            "signed",
        ]
        read_only_fields = fields

    def get_staff_name(self, obj) -> str:
        return obj.booking.staff.display_name if obj.booking.staff else "—"


class CompletionSubmitSerializer(serializers.Serializer):
    hours = serializers.DecimalField(max_digits=4, decimal_places=1, default=1.5)
    items = serializers.DictField(child=serializers.IntegerField(), required=False, default=dict)
    cust_note = serializers.CharField(required=False, allow_blank=True, default="")
    internal_note = serializers.CharField(required=False, allow_blank=True, default="")
    signed = serializers.BooleanField(default=False)


class AbandonSerializer(serializers.Serializer):
    reason = serializers.CharField(max_length=200)


class RateSerializer(serializers.Serializer):
    rating = serializers.IntegerField(min_value=1, max_value=5)
    comment = serializers.CharField(required=False, allow_blank=True, default="")


class CompensationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Compensation
        fields = ["id", "reason", "redeemed", "created_at"]
        read_only_fields = fields
