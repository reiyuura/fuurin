#!/usr/bin/env bash
# backup.sh — PostgreSQL backup for Fuurin (Sprint 25).
#
# Creates a compressed pg_dump in backups/ with a timestamped name.
# Keeps the last 14 backups and prunes older ones.
#
# Usage: ./backup.sh

set -euo pipefail
cd "$(dirname "$0")"

DB_URL=$(grep -E '^DATABASE_URL=' backend/.env | cut -d= -f2-)
TS=$(date +%Y%m%d-%H%M%S)
OUT_DIR="backups"
mkdir -p "$OUT_DIR"
OUT="$OUT_DIR/fuurin-$TS.dump"

pg_dump --format=custom --no-owner --no-acl "$DB_URL" > "$OUT"
SIZE=$(du -h "$OUT" | cut -f1)
echo "Backup written: $OUT ($SIZE)"

# Prune: keep newest 14.
ls -1t "$OUT_DIR"/fuurin-*.dump 2>/dev/null | tail -n +15 | xargs -r rm --
echo "Done. $(ls -1 "$OUT_DIR" | wc -l) backup(s) retained."