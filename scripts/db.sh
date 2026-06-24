#!/bin/sh
#
# 資料庫備份 / 還原 / 跨環境遷移 / 清理（dev | stage | prod 共用）
# ------------------------------------------------------------------
# 一般透過 Makefile 呼叫，也可直接執行：
#
#   scripts/db.sh dump    <env>
#   scripts/db.sh restore <env> [-f <file>] [-a] [-y]
#   scripts/db.sh prune   <env> [keep]
#
#   <env>          : dev | stage | prod（對應 docker-compose.<env>.yml）
#   dump           : 把 <env> 的整個 DB 備份成
#                    $DB_BACKUP_DIR/<env>_<YYYYMMDD_HHMMSS>.sql.gz
#   restore        : 把 <env> 的 DB「直接覆蓋」還原（DROP + CREATE）
#       (預設)      : 還原同環境最新的一份備份（.sql / .sql.gz 皆可）
#       -f <file>  : 指定一份備份檔，不限環境（跨環境遷移用）
#       -a         : 不分環境，還原 $DB_BACKUP_DIR 內最新的一份
#       -y         : 略過確認提示（非互動 / CI / 排程用）
#   prune          : 只保留每個環境最近 keep 份備份（預設 7），其餘刪除
#
# 設計重點（取自 Back2Work / Babyview-ERP 的生產實作）：
#   * 用 POSIX sh，能在 alpine 排程 sidecar 內直接執行（見 backend/ops/db_backup.sh）。
#   * 密碼只在 db 容器內使用（$POSTGRES_PASSWORD），不會落到 host 或參數列。
#   * dump 先寫 .tmp 成功才 rename，避免留下半截檔；gzip -9 壓縮。
#   * restore 還原前 gzip -t 驗證、踢掉連線後 DROP/CREATE，並濾掉 OWNER/GRANT
#     等與帳號綁定的語句，讓跨環境（含不同 DB 角色）也能還原。
#   * restore 為破壞性操作，預設要求輸入 yes 確認（-y 可略過）。
# ------------------------------------------------------------------
set -eu

# 切到 repo 根目錄（本檔位於 scripts/）
ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"

BACKUP_DIR="${DB_BACKUP_DIR:-backups}"
DB_SERVICE="${DB_SERVICE:-db}"
PG_DUMP_FLAGS="${PG_DUMP_FLAGS:---no-owner --no-privileges}"
DEFAULT_KEEP="${BACKUP_KEEP:-7}"
# host 的 make 與排程 sidecar 必須用同一個 compose project name，
# exec 才會打到同一組容器。
COMPOSE_PROJECT_NAME="${COMPOSE_PROJECT_NAME:-fullstackapp}"
export COMPOSE_PROJECT_NAME

die() { echo "❌ $*" >&2; exit 1; }

usage() {
  cat >&2 <<'EOF'
用法:
  scripts/db.sh dump    <env>
  scripts/db.sh restore <env> [-f <file>] [-a] [-y]
  scripts/db.sh prune   <env> [keep]
EOF
  exit 2
}

compose_file() {
  case "$1" in
    dev)   echo "docker-compose.dev.yml" ;;
    stage) echo "docker-compose.stage.yml" ;;
    prod)  echo "docker-compose.prod.yml" ;;
    *)     die "未知環境: $1（可用 dev|stage|prod）" ;;
  esac
}

dc() { docker compose -f "$COMPOSE" "$@"; }

ensure_db_up() {
  dc ps --status running --services 2>/dev/null | grep -qx "$DB_SERVICE" \
    || die "${ENV} 的 db 服務未啟動，請先 make ${ENV}（或 docker compose -f $COMPOSE up -d db）"
}

# 在 db 容器內取得目前 DB 名稱（顯示用）
db_name() {
  dc exec -T "$DB_SERVICE" printenv POSTGRES_DB | tr -d '\r'
}

do_dump() {
  ensure_db_up
  mkdir -p "$BACKUP_DIR"
  ts="$(date +%Y%m%d_%H%M%S)"
  out="${BACKUP_DIR}/${ENV}_${ts}.sql.gz"
  tmp="${out}.tmp"

  echo "📦 備份 ${ENV} DB（$(db_name)）→ ${out}"
  # pipefail 不在 POSIX 保證內，故用 tmp 檔 + 明確檢查回傳值
  if dc exec -T "$DB_SERVICE" sh -c \
        "PGPASSWORD=\"\$POSTGRES_PASSWORD\" pg_dump $PG_DUMP_FLAGS -U \"\$POSTGRES_USER\" \"\$POSTGRES_DB\"" \
        | gzip -9 > "$tmp" \
     && gzip -t "$tmp"; then
    mv "$tmp" "$out"
    echo "✅ 完成：${out}（$(du -h "$out" | cut -f1)）"
  else
    rm -f "$tmp"
    die "備份失敗：${ENV}"
  fi
}

pick_source() {
  mode="$1"; file="$2"
  case "$mode" in
    file)
      [ -n "$file" ] || die "-f 需要指定檔名"
      if [ -f "$file" ]; then echo "$file"
      elif [ -f "$BACKUP_DIR/$file" ]; then echo "$BACKUP_DIR/$file"
      else die "找不到備份檔: $file"
      fi
      ;;
    any)
      ls -1t "$BACKUP_DIR"/*.sql.gz "$BACKUP_DIR"/*.sql 2>/dev/null | head -n1 || true
      ;;
    *)
      ls -1t "$BACKUP_DIR/${ENV}_"*.sql.gz "$BACKUP_DIR/${ENV}_"*.sql 2>/dev/null | head -n1 || true
      ;;
  esac
}

do_restore() {
  mode="env"; file=""; assume_yes="0"
  while [ "$#" -gt 0 ]; do
    case "$1" in
      -f) mode="file"; file="${2:-}"; [ -n "$file" ] || die "-f 需要指定檔名"; shift 2 ;;
      -a) mode="any"; shift ;;
      -y|--yes) assume_yes="1"; shift ;;
      *) die "未知參數: $1" ;;
    esac
  done

  src="$(pick_source "$mode" "$file")"
  [ -n "$src" ] && [ -f "$src" ] || die "找不到可還原的備份檔（mode=$mode, dir=$BACKUP_DIR）"

  # 還原前先驗證壓縮檔完整性
  case "$src" in
    *.gz) gzip -t "$src" || die "備份檔已損毀（gzip 驗證失敗）: $src" ;;
  esac

  ensure_db_up
  target="$(db_name)"

  echo "⚠️  即將「直接覆蓋」還原 —— 目標 ${ENV} DB（${target}）會被 DROP 後重建！"
  echo "    來源備份檔：$src"
  if [ "$assume_yes" != "1" ]; then
    printf "    確定要繼續嗎？輸入 yes 確認： "
    read -r ans
    [ "$ans" = "yes" ] || die "已取消"
  fi

  echo "🔌 中斷既有連線並重建資料庫 ${target}…"
  dc exec -T "$DB_SERVICE" sh -c '
    PGPASSWORD="$POSTGRES_PASSWORD" psql -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d postgres \
      -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '"'"'$POSTGRES_DB'"'"' AND pid <> pg_backend_pid();" \
      -c "DROP DATABASE IF EXISTS \"$POSTGRES_DB\";" \
      -c "CREATE DATABASE \"$POSTGRES_DB\" OWNER \"$POSTGRES_USER\";"' >/dev/null

  echo "⏳ 還原中（${src}）…"
  case "$src" in
    *.gz) gzip -dc "$src" ;;
    *)    cat "$src" ;;
  esac \
    | sed -E '/^ALTER .* OWNER TO /d; /^SET SESSION AUTHORIZATION /d; /^(GRANT|REVOKE) /d; /^ALTER DEFAULT PRIVILEGES /d' \
    | dc exec -T "$DB_SERVICE" sh -c \
        'PGPASSWORD="$POSTGRES_PASSWORD" psql -v ON_ERROR_STOP=1 --quiet -U "$POSTGRES_USER" -d "$POSTGRES_DB"' >/dev/null

  echo "✅ 還原完成：${ENV} DB（${target}）← $src"
}

do_prune() {
  keep="${1:-$DEFAULT_KEEP}"
  [ -d "$BACKUP_DIR" ] || return 0
  removed="$(ls -1t "$BACKUP_DIR/${ENV}_"*.sql.gz "$BACKUP_DIR/${ENV}_"*.sql 2>/dev/null \
    | tail -n +"$((keep + 1))")"
  [ -n "$removed" ] || { echo "🧹 ${ENV}: 無需清理（保留 ${keep} 份）"; return 0; }
  echo "$removed" | xargs -r rm -f
  echo "🧹 ${ENV}: 已清理舊備份，保留最近 ${keep} 份"
}

# ------------------------------------------------------------------
cmd="${1:-}"; [ -n "$cmd" ] || usage
ENV="${2:-}"; [ -n "$ENV" ] || usage
COMPOSE="$(compose_file "$ENV")"
[ -f "$COMPOSE" ] || die "找不到 compose 檔: $COMPOSE"
shift 2

case "$cmd" in
  dump)    do_dump ;;
  restore) do_restore "$@" ;;
  prune)   do_prune "$@" ;;
  *)       usage ;;
esac
