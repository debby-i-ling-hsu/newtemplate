#!/bin/sh
set -eu

cd /app/backend

echo "[web] Running database migrations..."
python manage.py migrate --noinput

if [ "${DJANGO_COLLECTSTATIC_ON_START:-0}" = "1" ]; then
    echo "[web] Collecting static files..."
    python manage.py collectstatic --noinput
fi

# 允許 compose 用 command 覆寫（dev 走 runserver）
if [ "$#" -gt 0 ]; then
    exec "$@"
fi

exec uvicorn config.asgi:application \
    --host 0.0.0.0 \
    --port "${PORT:-8000}" \
    --workers "${UVICORN_WORKERS:-2}" \
    --proxy-headers \
    --forwarded-allow-ips="*"
