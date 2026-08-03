#!/usr/bin/env bash
# scripts/verify-db.sh — calls /api/v1/healthz?check=db against the
# configured base URL and verifies the database is reachable.

set -euo pipefail

BASE_URL="${VERIFY_BASE_URL:-http://127.0.0.1:4001}"

echo "==> GET ${BASE_URL}/api/v1/healthz?check=db"
status=$(curl -sS -o /tmp/health-db.json -w "%{http_code}" "${BASE_URL}/api/v1/healthz?check=db")
echo "status: ${status}"
cat /tmp/health-db.json
echo

if [ "${status}" != "200" ] && [ "${status}" != "503" ]; then
  echo "FAIL: unexpected HTTP status ${status} (expected 200 or 503)" >&2
  exit 1
fi

db_status=$(node -e "process.stdout.write(JSON.parse(require('fs').readFileSync('/tmp/health-db.json','utf8')).database?.status ?? 'missing')")
if [ "${db_status}" = "ok" ]; then
  echo "PASS: database is reachable."
  exit 0
fi
echo "FAIL: database status is ${db_status}" >&2
exit 1
