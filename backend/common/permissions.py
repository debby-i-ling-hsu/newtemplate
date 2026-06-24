"""共用 DRF 權限。"""

from rest_framework import permissions


class IsOwner(permissions.BasePermission):
    """物件層級權限：只有資源的 owner 能存取。

    這是 detail 端點的「第二道防線」。第一道仍是在 `get_queryset()` 用
    `request.user` 過濾——list 找不到別人的資料應回 404 而非 403，避免讓人
    用 id 枚舉出資源是否存在。兩者並用：queryset 過濾防枚舉，物件權限防漏網。
    """

    def has_object_permission(self, request, view, obj):
        return getattr(obj, "owner_id", None) == getattr(request.user, "id", None)
