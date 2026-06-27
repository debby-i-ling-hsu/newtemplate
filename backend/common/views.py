"""健康檢查與 SPA fallback。

- /healthz/live/：只回 200，給 Caddy 與 liveness 用（不碰相依服務）。
- /healthz/ready/：檢查 db / redis / queue / 必要 worker，給 compose healthcheck
  與 deploy.sh 部署閘門用；任一相依不健康回 503。
"""

import logging

from django.conf import settings
from django.core.cache import cache
from django.db import connection
from django.http import HttpResponse, JsonResponse

try:
    import redis as redis_lib
except Exception:
    redis_lib = None

health_logger = logging.getLogger("performance.health")


def health_live(_request):
    return JsonResponse({"status": "ok", "environment": settings.DJANGO_ENV})


def health_ready(_request):
    checks = {}
    metrics = {}
    http_status = 200

    # DB
    try:
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")
            cursor.fetchone()
        checks["db"] = "ok"
    except Exception as exc:
        checks["db"] = f"fail: {type(exc).__name__}"
        http_status = 503

    # Redis（broker）+ queue 長度
    broker_url = getattr(settings, "CELERY_BROKER_URL", "")
    if broker_url and redis_lib is not None and not broker_url.startswith("memory://"):
        try:
            client = redis_lib.Redis.from_url(
                broker_url, socket_connect_timeout=2, socket_timeout=2
            )
            client.ping()
            checks["redis"] = "ok"
            queue_names = [q.name for q in settings.CELERY_TASK_QUEUES]
            metrics["celery_queue_lengths"] = {
                name: client.llen(name) for name in dict.fromkeys(queue_names)
            }
        except Exception as exc:
            checks["redis"] = f"fail: {type(exc).__name__}"
            http_status = 503
    else:
        checks["redis"] = "skipped"

    # 必要 worker（用 celery heartbeat cache 判斷是否在線）
    required = getattr(settings, "CELERY_REQUIRED_WORKERS", [])
    if required:
        try:
            online = {
                worker
                for key in _scan_heartbeat_keys()
                for worker in _worker_hostname_candidates(key.split("celery:heartbeat:", 1)[-1])
            }
            missing = [
                name for name in required if not any(host.startswith(name) for host in online)
            ]
            checks["workers"] = "ok" if not missing else f"missing={','.join(missing)}"
            metrics["workers_online"] = sorted(online)
            if missing:
                http_status = 503
        except Exception as exc:
            checks["workers"] = f"fail: {type(exc).__name__}"
            http_status = 503

    metrics["db"] = {
        "conn_max_age": getattr(settings, "DB_EFFECTIVE_CONN_MAX_AGE", None),
        "pool_enabled": getattr(settings, "DB_USE_POOL", False),
    }

    if http_status != 200:
        health_logger.warning("healthz not ready checks=%s", checks)

    payload = {
        "status": "ok" if http_status == 200 else "fail",
        "environment": settings.DJANGO_ENV,
        "checks": checks,
        "metrics": metrics,
    }
    return JsonResponse(payload, status=http_status)


def _scan_heartbeat_keys():
    """從 default cache 取出 celery 心跳鍵。僅支援 redis cache backend。"""
    try:
        client = cache._cache.get_client()  # django-redis / RedisCache 內部 client
    except Exception:
        return []
    prefix = ""
    try:
        prefix = cache.make_key("celery:heartbeat:").rsplit("celery:heartbeat:", 1)[0]
    except Exception:
        pass
    return [
        key.decode() if isinstance(key, bytes) else key
        for key in client.scan_iter(match=f"{prefix}celery:heartbeat:*")
    ]


def _worker_hostname_candidates(hostname: str):
    """Return names healthz can match against CELERY_REQUIRED_WORKERS.

    Celery can report worker hostnames as ``celery@worker-default`` while this
    template config uses ``worker-default`` in CELERY_REQUIRED_WORKERS.
    heartbeat_sent may also pass a Heart object as sender; ignore those reprs.
    """

    hostname = str(hostname).strip()
    if not hostname or hostname.startswith("<"):
        return set()

    candidates = {hostname}
    if "@" in hostname:
        left, right = hostname.split("@", 1)
        candidates.add(right)
        if left != "celery":
            candidates.add(left)

    return {candidate for candidate in candidates if candidate and not candidate.startswith("<")}


def spa(_request):
    """回傳前端建置好的 index.html（prod）；dev 由 vite 提供，故給提示訊息。"""
    index_path = settings.BASE_DIR.parent / "frontend" / "dist" / "index.html"
    if index_path.exists():
        return HttpResponse(index_path.read_text(encoding="utf-8"))
    return HttpResponse(
        "<h1>Frontend not built</h1><p>開發時請用 vite（http://localhost:3000）；"
        "或執行 <code>npm --prefix frontend run build</code>。</p>",
        status=200,
    )
