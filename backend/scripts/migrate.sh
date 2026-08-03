#!/usr/bin/env bash
# scripts/migrate.sh — applies pending Prisma migrations to the
# configured database (DATABASE_URL). Use in production deploys.
#
# Companion: scripts/pre-migrate.sh (creates a schema-only pg_dump
# snapshot for rollback safety before running this).

set -euo pipefail
cd "$(dirname "$0")/.."

if [ -z "${DATABASE_URL:-}" ]; then
  if [ -f .env ]; then
    set -a
    # shellcheck disable=SC1091
    . ./.env
    set +a
  fi
fi

if [ -z "${DATABASE_URL:-}" ]; then
  echo "ERROR: DATABASE_URL is not set and no .env file is present." >&2
  exit 1
fi

echo "==> prisma migrate deploy (DATABASE_URL=${DATABASE_URL%%@*}@***)"
npx prisma migrate deploy
echo "==> done"
