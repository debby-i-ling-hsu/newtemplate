"""實測 media 儲存後端可寫入/讀回/刪除。

部署閘門（deploy.sh）會在 stage/prod 跑這個指令，確保雲端儲存真的通，
而不是只看設定值。失敗時非 0 退出，讓部署中止並回滾。
"""

import uuid
from contextlib import contextmanager
from signal import ITIMER_REAL, SIGALRM, setitimer, signal

from django.conf import settings
from django.core.files.base import ContentFile
from django.core.files.storage import default_storage
from django.core.management.base import BaseCommand, CommandError


class StorageSmokeTimeout(CommandError):
    pass


@contextmanager
def operation_timeout(seconds: int, label: str):
    def _handle_timeout(_signum, _frame):
        raise StorageSmokeTimeout(f"storage {label} timed out after {seconds}s")

    previous = signal(SIGALRM, _handle_timeout)
    setitimer(ITIMER_REAL, seconds)
    try:
        yield
    finally:
        setitimer(ITIMER_REAL, 0)
        signal(SIGALRM, previous)


class Command(BaseCommand):
    help = "Write, read back, and delete a probe file via the default storage backend."
    requires_system_checks = []

    def handle(self, *args, **options):
        name = f"healthz/storage_smoke_{uuid.uuid4().hex}.txt"
        payload = b"storage-smoke-test"
        timeout = getattr(settings, "STORAGE_SMOKE_OPERATION_TIMEOUT_SECS", 25)

        self.stdout.write(
            f"storage smoke using {settings.DEFAULT_FILE_STORAGE} "
            f"container={getattr(settings, 'AZURE_CONTAINER', '')} "
            f"operation_timeout={timeout}s"
        )
        self.stdout.flush()

        try:
            self.stdout.write(f"storage smoke write: {name}")
            self.stdout.flush()
            with operation_timeout(timeout, "write"):
                saved_name = default_storage.save(name, ContentFile(payload))
        except Exception as exc:
            raise CommandError(f"storage write failed: {exc!r}") from exc

        try:
            try:
                self.stdout.write(f"storage smoke read: {saved_name}")
                self.stdout.flush()
                with operation_timeout(timeout, "read"):
                    with default_storage.open(saved_name, "rb") as fh:
                        read_back = fh.read()
                if read_back != payload:
                    raise CommandError("storage read-back mismatch")
            except Exception as exc:
                raise CommandError(f"storage read failed: {exc!r}") from exc
        finally:
            try:
                self.stdout.write(f"storage smoke delete: {saved_name}")
                self.stdout.flush()
                with operation_timeout(timeout, "delete"):
                    default_storage.delete(saved_name)
            except Exception as exc:
                raise CommandError(f"storage delete failed: {exc!r}") from exc

        self.stdout.write(self.style.SUCCESS(f"storage OK ({default_storage.__class__.__name__})"))
