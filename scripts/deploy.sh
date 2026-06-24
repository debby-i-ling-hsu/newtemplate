#!/bin/sh
# 安全部署（stage / prod）。這是系統穩定性的核心：
#   儲存閘門 → 備份 → 建置 → migrate → check --deploy → 滾動重啟 →
#   /healthz/ready/ 重試閘門 → storage smoke test → 失敗自動回滾 image。
# 用法：./scripts/deploy.sh stage|prod （或 make stage / make prod）
set -eu

environment="${1:-}"
case "$environment" in
  stage|prod) ;;
  *) echo "Usage: $0 stage|prod" >&2; exit 2 ;;
esac

# host 與排程 sidecar 共用同一 compose project name（scripts/db.sh 也依賴它）
export COMPOSE_PROJECT_NAME="${COMPOSE_PROJECT_NAME:-fullstackapp}"

compose="docker compose -f docker-compose.${environment}.yml"
env_file="./backend/env/.env.${environment}"
backup_dir="${DB_BACKUP_DIR:-backups}"
timestamp="$(date +%Y%m%d-%H%M%S)"
workers="worker-default worker-maintenance worker-long-running"
web_image="fullstackapp-web:${environment}"
worker_image="fullstackapp-worker:${environment}"
beat_image="fullstackapp-beat:${environment}"

[ -f "$env_file" ] || { echo "[deploy] missing $env_file" >&2; exit 1; }

env_value() { sed -n "s/^$1=//p" "$2" | tail -n 1; }

# ── 儲存閘門：stage/prod 一律走 Azure Blob，且 prod 與 stage 帳號必須不同 ──
storage_backend="$(env_value DEFAULT_FILE_STORAGE "$env_file")"
storage_account="$(env_value AZURE_ACCOUNT_NAME "$env_file")"
case "$storage_backend" in
  storages.backends.azure_storage.AzureStorage|common.storage.AutoCreateAzureStorage) ;;
  *) echo "[deploy] ${environment} 必須使用 Azure Blob 儲存（DEFAULT_FILE_STORAGE）。" >&2; exit 1 ;;
esac
[ -n "$storage_account" ] || { echo "[deploy] ${environment} 需要 AZURE_ACCOUNT_NAME。" >&2; exit 1; }
if [ "$environment" = "prod" ] && [ -f ./backend/env/.env.stage ]; then
  stage_account="$(env_value AZURE_ACCOUNT_NAME ./backend/env/.env.stage)"
  if [ -n "$stage_account" ] && [ "$storage_account" = "$stage_account" ]; then
    echo "[deploy] Prod 與 Stage 必須使用不同的 Azure Storage 帳號。" >&2
    exit 1
  fi
fi

# ── 記住目前 image 以便回滾 ──
old_web="$(docker image inspect -f '{{.Id}}' "$web_image" 2>/dev/null || true)"
old_worker="$(docker image inspect -f '{{.Id}}' "$worker_image" 2>/dev/null || true)"
old_beat="$(docker image inspect -f '{{.Id}}' "$beat_image" 2>/dev/null || true)"
rollback_needed=0

rollback() {
  rollback_needed=0
  echo "[deploy] 部署閘門失敗，回滾為先前的 image。" >&2
  [ -z "$old_web" ] || docker tag "$old_web" "$web_image"
  [ -z "$old_worker" ] || docker tag "$old_worker" "$worker_image"
  [ -z "$old_beat" ] || docker tag "$old_beat" "$beat_image"
  $compose up -d --no-build web $workers beat
}

on_exit() {
  status=$?
  trap - EXIT HUP INT TERM
  [ "$status" -ne 0 ] && [ "$rollback_needed" -eq 1 ] && rollback
  exit "$status"
}
trap 'exit 129' HUP
trap 'exit 130' INT
trap 'exit 143' TERM
trap on_exit EXIT

# ── 建置與相依服務 ──
$compose config -q
$compose build web worker-default beat
$compose up -d db redis

# ── migrate 前先備份 DB（與 make <env>-dump / 排程 sidecar 共用 scripts/db.sh，命名一致）──
./scripts/db.sh dump "$environment"
backup_file="$(ls -1t "${backup_dir}/${environment}_"*.sql.gz 2>/dev/null | head -n1)"
[ -n "$backup_file" ] || { echo "[deploy] DB 備份失敗，中止部署。" >&2; exit 1; }

# ── migrate + 部署檢查 ──
$compose run --rm --no-deps --entrypoint python web manage.py migrate --noinput
$compose run --rm --no-deps --entrypoint python web manage.py check --deploy

# ── 換上新 web，再滾動重啟 worker/beat ──
$compose up -d --no-build web
rollback_needed=1
$compose stop -t 30 beat >/dev/null 2>&1 || true
$compose stop -t 120 $workers >/dev/null 2>&1 || true
$compose up -d --no-build $workers beat
$compose up -d db-backup 2>/dev/null || true

# ── 健康閘門：等 /healthz/ready/ 變綠（最多約 2 分鐘）──
attempt=1
until $compose exec -T web curl -fsS http://127.0.0.1:8000/healthz/ready/ >/dev/null 2>&1; do
  if [ "$attempt" -ge 24 ]; then
    echo "[deploy] /healthz/ready/ 一直沒綠燈，中止。" >&2
    exit 1
  fi
  attempt=$((attempt + 1))
  sleep 5
done

# ── 真打一次儲存後端，確保雲端讀寫真的通 ──
$compose exec -T web python manage.py storage_smoke_test

rollback_needed=0
trap - EXIT HUP INT TERM
echo "[deploy] ${environment} 部署完成。備份：${backup_file}"
