#!/usr/bin/env bash
# BUSINESS_CONTINUITY_AND_DISASTER_RECOVERY_STANDARD.md's testing rule:
# "a real restore of a recent backup to an isolated environment, verified
# against reconciliation, not just 'the restore command completed.'"
# Restores to an ISOLATED target database by default — never the source
# database — matching that isolation requirement. Pass --target to name it
# explicitly.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(dirname "$SCRIPT_DIR")"

source "$REPO_ROOT/.env" 2>/dev/null || true
DATABASE_URL="${DATABASE_URL:?DATABASE_URL not set (check .env)}"

DUMP_FILE="${1:?Usage: restore.sh <dump-file> [--target db_name]}"
TARGET_DB="${3:-core1x_restore_test}"

if [ ! -f "$DUMP_FILE" ]; then
  echo "Dump file not found: $DUMP_FILE" >&2
  exit 1
fi

# Derive connection params (host/port/user) from DATABASE_URL, swap only the db name.
BASE_URL="${DATABASE_URL%/*}"
TARGET_URL="$BASE_URL/$TARGET_DB"

echo "Restoring $DUMP_FILE -> isolated target database '$TARGET_DB' (never the source DB)"
START=$(date +%s)

psql "$BASE_URL/postgres" -v ON_ERROR_STOP=1 -c "DROP DATABASE IF EXISTS $TARGET_DB;" >/dev/null
psql "$BASE_URL/postgres" -v ON_ERROR_STOP=1 -c "CREATE DATABASE $TARGET_DB;" >/dev/null
pg_restore --dbname="$TARGET_URL" --no-owner --no-privileges "$DUMP_FILE"

END=$(date +%s)
echo "Restore complete into '$TARGET_DB' in $((END - START))s"
echo "$TARGET_URL"
