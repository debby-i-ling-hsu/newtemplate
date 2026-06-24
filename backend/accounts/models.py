from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser):
    """自訂 User（在專案開始就替換預設 User，日後要擴充欄位才不會難改）。

    預設仍用 username 登入；要改 email 登入時，調整 USERNAME_FIELD 即可。
    """

    display_name = models.CharField(max_length=150, blank=True)

    def __str__(self) -> str:
        return self.get_username()
