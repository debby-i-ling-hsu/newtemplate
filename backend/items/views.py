from rest_framework import permissions, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from common.permissions import IsOwner

from . import services
from .models import Item
from .serializers import ItemSerializer
from .tasks import send_item_completed_notification


class ItemViewSet(viewsets.ModelViewSet):
    """每位使用者只能看到/操作自己的 items。

    - 資料隔離：get_queryset 用 request.user 過濾（list 看不到別人的，detail 回 404）。
    - IsOwner 是 detail 的第二道防線（見 common.permissions.IsOwner）。
    - filter / search / ordering：?is_done=true、?search=milk、?ordering=-created_at。
    """

    serializer_class = ItemSerializer
    # 僅供 schema 內省用；實際資料一律走 get_queryset（依 request.user 過濾）。
    queryset = Item.objects.none()
    permission_classes = [permissions.IsAuthenticated, IsOwner]
    filterset_fields = ["is_done"]
    search_fields = ["name", "description"]
    ordering_fields = ["created_at", "name"]
    ordering = ["-created_at"]

    def get_queryset(self):
        return services.list_items_for(self.request.user)

    def perform_create(self, serializer):
        serializer.save(owner=self.request.user)

    @action(detail=True, methods=["post"])
    def complete(self, request, pk=None):
        """標記完成（idempotent）。敏感狀態變更交給 service 層處理。"""
        self.get_object()  # 套用 queryset 過濾 + IsOwner，找不到→404
        item, changed = services.complete_item(user=request.user, item_id=pk)
        if changed:
            # 副作用在交易完成後才以背景任務觸發（不阻塞請求、可重試）
            send_item_completed_notification.delay(item.id)
        return Response(self.get_serializer(item).data)
