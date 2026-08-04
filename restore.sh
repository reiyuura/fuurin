#!/usr/bin/env bash
# restore.sh — restore Fuurin database from a backup (Sprint 25).
#
# DESTRUCTIVE: drops and recreates the target schema.
# Usage: ./restore.sh backups/fuurin-YYYYMMDD-HHMMSS.dump

set -euo pipefail
cd "$(dirname "$0")"

FILE="${1:-}"
if [ -z "$FILE" ] || [ ! -f "$FILE" ]; then
  echo "Usage: $0 backups/fuurin-<timestamp>.dump" >&2
  ls -1t backups/fuurin-*.dump 2>/dev/null | head -5 >&2 || true
  exit 1
fi

DB_URL=$(grep -E '^DATABASE_URL=' backend/.env | cut -d= -f2-)

echo "This will REPLACE the current database with $FILE."
read -r -p "Continue? [y/N] " confirm
[ "$confirm" = "y" ] || [ "$confirm" = "Y" ] || exit 1

pg_restore --clean --if-exists --no-owner --no-acl --dbname="$DB_URL" "$FILE"
echo "Restore complete."