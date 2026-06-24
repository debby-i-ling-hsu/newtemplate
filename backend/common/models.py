from django.db import models


class TimeStampedModel(models.Model):
    """所有業務 model 的共用基底：建立/更新時間。"""

    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True
