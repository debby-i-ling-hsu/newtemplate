"""商業邏輯層。

view 只負責 HTTP（驗證輸入、回傳 response），真正的規則寫在 services。
這樣邏輯可被 Celery 任務、management command、其他 service 重用，也好測試。
"""

from django.contrib.auth import get_user_model
from django.db import transaction
from django.db.models import QuerySet

from .models import Item

User = get_user_model()


def list_items_for(user: User) -> QuerySet[Item]:
    return Item.objects.filter(owner=user)


def create_item(*, owner: User, name: str, description: str = "", is_done: bool = False) -> Item:
    return Item.objects.create(
        owner=owner,
        name=name,
        description=description,
        is_done=is_done,
    )


@transaction.atomic
def complete_item(*, user: User, item_id) -> tuple[Item, bool]:
    """把 item 標記為完成。★ 這是「敏感狀態變更」的正確寫法範本。

    回傳 (item, changed)；changed=False 代表本來就已完成（no-op）。

    為什麼這樣寫——金流 / 庫存 / 計數這類操作都該照這個骨架：

    1. transaction.atomic + select_for_update()：鎖住這一列，避免兩個並發請求
       同時讀到「未完成」、各自再寫一次，造成 read-modify-write race
       （例如重複扣款、超賣）。鎖會在交易結束時釋放。
    2. idempotent（可安全重試）：已完成就直接回傳、不重複觸發副作用。使用者會
       雙擊、客戶端會逾時重送、Celery acks_late 會重跑——同一動作跑兩次必須安全。
    3. 數值增減（餘額、計數）優先用 F() 表達式（DB 端原子運算），或一樣先
       select_for_update 鎖列再算，不要把值讀到 Python 再寫回。
    4. 不要在 atomic 區塊裡呼叫外部 API（會一直握著鎖）；副作用（寄信、打第三方）
       交給交易提交後的 Celery 任務（見 tasks.py）。
    """
    item = Item.objects.select_for_update().get(owner=user, id=item_id)
    if item.is_done:
        return item, False
    item.is_done = True
    item.save(update_fields=["is_done", "updated_at"])
    return item, True
