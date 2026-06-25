from rest_framework import permissions, viewsets

from .models import Service, ServicePackage
from .serializers import ServicePackageSerializer, ServiceSerializer


class ServiceViewSet(viewsets.ReadOnlyModelViewSet):
    """客戶 App 取用啟用中的服務項目。新增 / 編輯 / 停用一律走 Django Admin。"""

    serializer_class = ServiceSerializer
    permission_classes = [permissions.IsAuthenticated]
    queryset = Service.objects.filter(active=True)


class ServicePackageViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = ServicePackageSerializer
    permission_classes = [permissions.IsAuthenticated]
    queryset = ServicePackage.objects.filter(active=True)
