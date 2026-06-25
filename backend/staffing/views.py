from datetime import date

from rest_framework import permissions, viewsets
from rest_framework.response import Response
from rest_framework.views import APIView

from common.permissions import IsStaff

from .models import ServiceArea, StaffSchedule
from .serializers import ServiceAreaSerializer, StaffScheduleSerializer


class ServiceAreaViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = ServiceAreaSerializer
    permission_classes = [permissions.IsAuthenticated]
    queryset = ServiceArea.objects.all()


class StaffScheduleView(APIView):
    """業務查詢 / 提交自己當月（或指定月）的班表。"""

    permission_classes = [permissions.IsAuthenticated, IsStaff]

    def _month(self, request) -> str:
        return request.query_params.get("month") or date.today().strftime("%Y-%m")

    def get(self, request):
        month = self._month(request)
        schedule, _ = StaffSchedule.objects.get_or_create(staff=request.user, month=month)
        return Response(StaffScheduleSerializer(schedule).data)

    def put(self, request):
        month = request.data.get("month") or self._month(request)
        schedule, _ = StaffSchedule.objects.get_or_create(staff=request.user, month=month)
        serializer = StaffScheduleSerializer(schedule, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save(staff=request.user, month=month)
        return Response(serializer.data)
