"""媒體檔儲存後端。

stage/prod 用 Azure Blob。AutoCreateAzureStorage 會在容器不存在時自動建立，
方便首次部署。需要 django-storages[azure] 與 azure-storage-blob。
"""

from django.conf import settings

try:
    from storages.backends.azure_storage import AzureStorage
except Exception:  # 本地未安裝 azure 套件時不致 import 失敗
    AzureStorage = object  # type: ignore


class AutoCreateAzureStorage(AzureStorage):  # type: ignore[misc]
    """容器不存在時自動建立的 Azure Blob 儲存。"""

    def __init__(self, *args, **kwargs):
        kwargs.setdefault("account_name", getattr(settings, "AZURE_ACCOUNT_NAME", ""))
        kwargs.setdefault("account_key", getattr(settings, "AZURE_ACCOUNT_KEY", ""))
        kwargs.setdefault("azure_container", getattr(settings, "AZURE_CONTAINER", "media"))
        kwargs.setdefault("expiration_secs", getattr(settings, "AZURE_URL_EXPIRATION_SECS", 3600))
        super().__init__(*args, **kwargs)
        try:
            self.client.create_container()
        except Exception:
            # 已存在或權限不足都不阻斷啟動；storage_smoke_test 會實測讀寫
            pass
