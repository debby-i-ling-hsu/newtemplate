from datetime import date as date_cls

from rest_framework import mixins, permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from common.permissions import IsCustomer, IsStaff

from . import services
from .models import Booking, Compensation
from .serializers import (
    AbandonSerializer,
    BookingCreateSerializer,
    BookingSerializer,
    CompensationSerializer,
    CompletionSerializer,
    CompletionSubmitSerializer,
    RateSerializer,
)
from .tasks import send_booking_notification


class BookingViewSet(
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    viewsets.GenericViewSet,
):
    """客戶端預約：列出自己的、建立新預約、取消。"""

    serializer_class = BookingSerializer
    permission_classes = [permissions.IsAuthenticated, IsCustomer]
    queryset = Booking.objects.none()

    def get_queryset(self):
        return services.list_customer_bookings(self.request.user)

    def create(self, request):
        serializer = BookingCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        booking = services.create_booking(customer=request.user, **serializer.validated_data)
        send_booking_notification.delay(booking.id, "created")
        return Response(BookingSerializer(booking).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["post"])
    def cancel(self, request, pk=None):
        self.get_object()
        booking = services.cancel_booking(customer=request.user, booking_id=pk)
        return Response(BookingSerializer(booking).data)


class CompletionViewSet(
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    viewsets.GenericViewSet,
):
    """客戶端服務紀錄：查歷次完工、評分。"""

    serializer_class = CompletionSerializer
    permission_classes = [permissions.IsAuthenticated, IsCustomer]
    queryset = Booking.objects.none()

    def get_queryset(self):
        return services.list_customer_completions(self.request.user)

    @action(detail=True, methods=["post"])
    def rate(self, request, pk=None):
        self.get_object()
        serializer = RateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        completion = services.rate_completion(
            customer=request.user, completion_id=pk, **serializer.validated_data
        )
        return Response(CompletionSerializer(completion).data)


class CompensationViewSet(mixins.ListModelMixin, viewsets.GenericViewSet):
    serializer_class = CompensationSerializer
    permission_classes = [permissions.IsAuthenticated, IsCustomer]
    queryset = Compensation.objects.none()

    def get_queryset(self):
        return Compensation.objects.filter(customer=self.request.user)


class DispatchViewSet(
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    viewsets.GenericViewSet,
):
    """業務端派工：列出指派給我的、查詳情、完工回報、棄單。"""

    serializer_class = BookingSerializer
    permission_classes = [permissions.IsAuthenticated, IsStaff]
    queryset = Booking.objects.none()

    def get_queryset(self):
        on_date = None
        date_param = self.request.query_params.get("date")
        if date_param:
            try:
                on_date = date_cls.fromisoformat(date_param)
            except ValueError:
                on_date = None
        return services.list_staff_dispatch(self.request.user, on_date=on_date)

    @action(detail=True, methods=["post"])
    def complete(self, request, pk=None):
        self.get_object()
        serializer = CompletionSubmitSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        completion = services.submit_completion(
            staff=request.user, booking_id=pk, **serializer.validated_data
        )
        send_booking_notification.delay(completion.booking_id, "completed")
        return Response(CompletionSerializer(completion).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["post"])
    def abandon(self, request, pk=None):
        self.get_object()
        serializer = AbandonSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        booking = services.abandon_booking(
            staff=request.user, booking_id=pk, reason=serializer.validated_data["reason"]
        )
        send_booking_notification.delay(booking.id, "abandoned")
        return Response(BookingSerializer(booking).data)
