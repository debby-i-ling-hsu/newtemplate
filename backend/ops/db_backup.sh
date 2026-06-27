#!/bin/sh
#
# 排程備份 sidecar（取自 Back2Work 生產實作）。
# 用 crond 依 BACKUP_SCHEDULE 週期性呼叫 scripts/db.sh dump <env>，
# 並在每次備份後 prune 只保留最近 BACKUP_KEEP 份。
#
# 此容器需掛載：repo 工作區（/workspace）與 docker socket，
# 才能透過 `docker compose ... exec db pg_dump` 備份同一組 compose 容器。
# 對應 docker-compose.{stage,prod}.yml 的 db-backup 服務。
set -eu

: "${BACKUP_ENV:?BACKUP_ENV is required: dev, stage, or prod}"

WORKSPACE_DIR="${WORKSPACE_DIR:-/workspace}"
BACKUP_SCHEDULE="${BACKUP_SCHEDULE:-0 3 * * *}"
BACKUP_KEEP="${BACKUP_KEEP:-7}"

case "$BACKUP_ENV" in
  dev|stage|prod) ;;
  *) echo "Unsupported BACKUP_ENV: $BACKUP_ENV" >&2; exit 1 ;;
esac

[ -f "$WORKSPACE_DIR/scripts/db.sh" ] \
  || { echo "scripts/db.sh not found under WORKSPACE_DIR=$WORKSPACE_DIR" >&2; exit 1; }

mkdir -p "$WORKSPACE_DIR/backups"

echo "Scheduling $BACKUP_ENV DB backups (schedule='$BACKUP_SCHEDULE', keep=$BACKUP_KEEP) via scripts/db.sh"

# crond 環境很乾淨，把需要的值寫進 crontab；輸出導到 PID 1 讓 docker logs 看得到。
cat > /etc/crontabs/root <<EOF
SHELL=/bin/sh
PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
COMPOSE_PROJECT_NAME=${COMPOSE_PROJECT_NAME:-newtemplate}
$BACKUP_SCHEDULE cd "$WORKSPACE_DIR" && ./scripts/db.sh dump "$BACKUP_ENV" -y >> /proc/1/fd/1 2>> /proc/1/fd/2 && ./scripts/db.sh prune "$BACKUP_ENV" "$BACKUP_KEEP" >> /proc/1/fd/1 2>> /proc/1/fd/2
EOF

echo "Installed crontab:"
cat /etc/crontabs/root

exec crond -f -d 8
