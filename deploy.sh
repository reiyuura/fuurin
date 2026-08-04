#!/usr/bin/env bash
# deploy.sh — repeatable Fuurin deployment (Sprint 25).
#
# Steps: migrate → seed (optional) → build backend → build frontend →
# restart PM2 → smoke test. Fails fast on any error.
#
# Usage:
#   ./deploy.sh            # full deploy
#   ./deploy.sh --skip-seed
#   ./deploy.sh --skip-build

set -euo pipefail
cd "$(dirname "$0")"

SKIP_SEED=0
SKIP_BUILD=0
for arg in "$@"; do
  case "$arg" in
    --skip-seed) SKIP_SEED=1 ;;
    --skip-build) SKIP_BUILD=1 ;;
  esac
done

log() { printf '\033[1;34m==>\033[0m %s\n' "$*"; }
fail() { printf '\033[1;31mFAIL:\033[0m %s\n' "$*" >&2; exit 1; }

# ── 1. Migrations ─────────────────────────────────────────────
log "Applying database migrations (backend)"
cd backend
npx prisma migrate deploy || fail "migrate deploy failed"
cd ..

# ── 2. Seed (optional) ────────────────────────────────────────
if [ "$SKIP_SEED" -eq 0 ]; then
  log "Seeding database (idempotent upsert)"
  cd backend
  npx prisma db seed || fail "seed failed"
  cd ..
fi

# ── 3. Build ──────────────────────────────────────────────────
if [ "$SKIP_BUILD" -eq 0 ]; then
  log "Building backend (esbuild → dist/server.mjs)"
  (cd backend && npm run build) || fail "backend build failed"

  log "Building frontend (next build)"
  npm run build || fail "frontend build failed"
fi

# ── 4. Restart ────────────────────────────────────────────────
log "Restarting PM2 services (fuurin-backend, fuurin-album)"
pm2 restart fuurin-backend fuurin-album --update-env || fail "pm2 restart failed"
sleep 2

# ── 5. Smoke test ─────────────────────────────────────────────
log "Smoke testing production endpoints"
BASE="https://fuurin.reiyuura.pw"

check() {
  local name="$1" url="$2" expect="$3" method="${4:-GET}"
  local code
  code=$(curl -s -o /dev/null -w '%{http_code}' -X "$method" "$url")
  if [ "$code" != "$expect" ]; then
    fail "$name → HTTP $code (expected $expect): $url"
  fi
  echo "  ✓ $name → $code"
}

check "healthz"      "$BASE/api/v1/healthz"              200
check "albums"       "$BASE/api/v1/albums"               200
check "stats"        "$BASE/api/v1/stats"                200
check "drafts"       "$BASE/api/v1/drafts"               200
check "home"         "$BASE/"                            200
check "login page"   "$BASE/login"                       200
check "editor media" "$BASE/editor/media"                200
check "auth refresh" "$BASE/api/v1/auth/refresh"         401 POST
check "users/me"     "$BASE/api/v1/users/me"             401
check "write guard"  "$BASE/api/v1/albums"               401 POST

log "Deployment complete — all smoke tests passed."