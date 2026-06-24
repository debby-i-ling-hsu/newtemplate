"""Celery application factory.

Queue 拆分原則見 docs/ARCHITECTURE.md：每種任務型態走獨立佇列與獨立 worker，
互不搶資源。預設提供三條通用佇列：default / maintenance / long_running。
"""

import os
import sys

from celery import Celery
from celery.signals import (
    before_task_publish,
    heartbeat_sent,
    setup_logging,
    task_postrun,
    task_prerun,
    worker_before_create_process,
    worker_process_init,
    worker_ready,
)

from config.logging_utils import (
    get_request_id,
    reset_request_id,
    reset_task_context,
    set_request_id,
    set_task_context,
)

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.dev")

app = Celery("fullstackapp")
app.config_from_object("django.conf:settings", namespace="CELERY")
app.autodiscover_tasks()

# task_id -> 還原 contextvar 用的 token，task_postrun 時還原
_task_context_tokens: dict = {}

app.conf.update(
    task_acks_late=True,  # worker 成功處理後才 ack，避免任務遺失
    task_reject_on_worker_lost=True,  # worker 意外中止時重新入隊
    worker_prefetch_multiplier=1,  # 每次只預取 1 個任務，避免記憶體暴衝
    task_track_started=True,  # 允許監控任務進度
)

# macOS 本機開發：用 solo pool 避免 prefork fork 問題
_django_env = os.environ.get("DJANGO_ENV", "dev")
if sys.platform == "darwin" and _django_env in {"dev", "test"}:
    app.conf.worker_pool = "solo"


@worker_before_create_process.connect
def _close_db_before_fork(**kwargs):
    """prefork 前關閉 DB 連線，避免 psycopg pool 被子 process 繼承。"""
    from django.db import connections

    connections.close_all()


@worker_process_init.connect
def _close_inherited_db_in_child(**kwargs):
    """子 process 啟動時清掉繼承來的 DB 連線。"""
    from django.db import connections

    connections.close_all()


@setup_logging.connect
def _use_django_logging(**kwargs):
    """阻止 Celery 用自己的格式劫持 root logger，改用 Django 的 LOGGING 設定，
    讓 worker 日誌與 web 一致（結構化、含 request_id/task context）。"""
    from logging.config import dictConfig

    from django.conf import settings

    dictConfig(settings.LOGGING)


# ---------------------------------------------------------------------------
# Log 關聯 ID 串接：把發任務當下的 request_id 隨任務 header 帶到 worker，
# 並在任務執行期間綁上 request_id / task_id / task_name，讓 worker 日誌可回溯到
# 觸發它的那個 API 請求。
# ---------------------------------------------------------------------------
@before_task_publish.connect
def _attach_request_id_to_task(headers=None, **kwargs):
    request_id = get_request_id()
    if headers is not None and request_id and request_id != "-":
        headers["request_id"] = request_id


@task_prerun.connect
def _bind_task_log_context(task_id=None, task=None, **kwargs):
    task_name = getattr(task, "name", "") if task else ""
    request = getattr(task, "request", None)
    headers = getattr(request, "headers", None) or {}
    request_id = headers.get("request_id", "") if isinstance(headers, dict) else ""
    request_token = set_request_id(request_id)
    task_tokens = set_task_context(task_id or "", task_name)
    if task_id:
        _task_context_tokens[task_id] = (request_token, task_tokens)


@task_postrun.connect
def _clear_task_log_context(task_id=None, **kwargs):
    tokens = _task_context_tokens.pop(task_id, None)
    if not tokens:
        return
    request_token, task_tokens = tokens
    reset_task_context(task_tokens)
    reset_request_id(request_token)


def _record_worker_heartbeat(sender=None, **kwargs):
    """把 worker 心跳寫進 cache，供 /healthz/ready/ 判斷 worker 是否存活。"""
    try:
        from django.core.cache import cache

        hostname = getattr(sender, "hostname", None) or str(sender or "unknown")
        cache.set(f"celery:heartbeat:{hostname}", "ok", timeout=90)
    except Exception:
        pass


worker_ready.connect(_record_worker_heartbeat, weak=False)
heartbeat_sent.connect(_record_worker_heartbeat, weak=False)
