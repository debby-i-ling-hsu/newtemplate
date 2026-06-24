#!/bin/sh
set -eu

cd /app/backend

# 等 broker 起來再啟動 worker
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
    echo "[worker] Waiting for broker..."
    sleep 3
done

# prefork worker 與 psycopg pool 不相容：fork 前主動關閉 pool
WORKER_POOL="${CELERY_WORKER_POOL:-prefork}"
if [ "${DB_USE_POOL:-False}" = "True" ] && [ "$WORKER_POOL" = "prefork" ]; then
    echo "[worker] DB_USE_POOL + prefork detected — disabling pool for worker safety"
    export DB_USE_POOL=False
fi

exec celery -A config worker \
    -l info \
    --pidfile= \
    -Q "${CELERY_WORKER_QUEUES:-default}" \
    --concurrency="${CELERY_WORKER_CONCURRENCY:-2}" \
    --prefetch-multiplier="${CELERY_PREFETCH_MULTIPLIER:-1}" \
    --max-tasks-per-child="${CELERY_MAX_TASKS_PER_CHILD:-100}" \
    --hostname="${CELERY_WORKER_NAME:-worker@%h}"
