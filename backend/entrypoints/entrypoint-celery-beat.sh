#!/bin/sh
set -eu

cd /app/backend

until python - <<'PY'
import os
from urllib.parse import urlparse
from redis import Redis

broker_url = os.environ.get("CELERY_BROKER_URL", "redis://redis:6379/0")
parsed = urlparse(broker_url)
Redis(
    host=parsed.hostname,
    port=parsed.port or 6379,
    db=int((parsed.path or "/0").strip("/") or 0),
    socket_connect_timeout=1,
    socket_timeout=1,
).ping()
PY
do
    echo "[beat] Waiting for broker..."
    sleep 3
done

exec celery -A config beat -l info --pidfile= \
    --scheduler django_celery_beat.schedulers:DatabaseScheduler
