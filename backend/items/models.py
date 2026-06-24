from django.conf import settings
from django.db import models

from common.models import TimeStampedModel


class Item(TimeStampedModel):
    """通用 CRUD 範例 model。新增功能時請照這個結構複製成你自己的 model。"""

    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="items",
    )
    name = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    is_done = models.BooleanField(default=False)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return self.name
