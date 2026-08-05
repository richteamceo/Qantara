#!/usr/bin/env bash
# BUSINESS_CONTINUITY_AND_DISASTER_RECOVERY_STANDARD.md / NON_FUNCTIONAL_REQUIREMENTS.md
# "Backup, restore, RPO, RTO" section — daily full snapshot equivalent for
# this build. This sandbox has no managed-database continuous
# point-in-time-recovery feature to hook into, so this script produces the
# snapshot half only (pg_dump custom format) — see CHECKPOINT_9_REPORT.md
# for what that does and doesn't demonstrate against the pack's real RPO
# target.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(dirname "$SCRIPT_DIR")"
BACKUP_DIR="${BACKUP_DIR:-$REPO_ROOT/backups}"

source "$REPO_ROOT/.env" 2>/dev/null || true
DATABASE_URL="${DATABASE_URL:?DATABASE_URL not set (check .env)}"

TIMESTAMP="$(date -u +%Y%m%dT%H%M%SZ)"
OUT_FILE="$BACKUP_DIR/core1x-$TIMESTAMP.dump"

mkdir -p "$BACKUP_DIR"

echo "Backing up $DATABASE_URL -> $OUT_FILE"
START=$(date +%s)
pg_dump "$DATABASE_URL" --format=custom --no-owner --no-privileges --file="$OUT_FILE"
END=$(date +%s)

SIZE=$(du -h "$OUT_FILE" | cut -f1)
echo "Backup complete: $OUT_FILE ($SIZE, $((END - START))s)"
echo "$OUT_FILE"
