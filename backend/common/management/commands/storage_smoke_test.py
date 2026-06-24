"""實測 media 儲存後端可寫入/讀回/刪除。

部署閘門（deploy.sh）會在 stage/prod 跑這個指令，確保雲端儲存真的通，
而不是只看設定值。失敗時非 0 退出，讓部署中止並回滾。
"""

import uuid

from django.core.files.base import ContentFile
from django.core.files.storage import default_storage
from django.core.management.base import BaseCommand, CommandError


class Command(BaseCommand):
    help = "Write, read back, and delete a probe file via the default storage backend."

    def handle(self, *args, **options):
        name = f"healthz/storage_smoke_{uuid.uuid4().hex}.txt"
        payload = b"storage-smoke-test"

        try:
            saved_name = default_storage.save(name, ContentFile(payload))
        except Exception as exc:
            raise CommandError(f"storage write failed: {exc!r}") from exc

        try:
            with default_storage.open(saved_name, "rb") as fh:
                read_back = fh.read()
            if read_back != payload:
                raise CommandError("storage read-back mismatch")
        finally:
            try:
                default_storage.delete(saved_name)
            except Exception as exc:
                raise CommandError(f"storage delete failed: {exc!r}") from exc

        self.stdout.write(self.style.SUCCESS(f"storage OK ({default_storage.__class__.__name__})"))
