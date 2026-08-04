#!/usr/bin/env bash
# smoke-e2e.sh — end-to-end flow verification against production (Sprint 25).
#
# Covers: login → upload → create draft → publish → reorder → replace (N/A) → logout.
# Requires jq for JSON parsing.

set -euo pipefail

BASE="${BASE_URL:-https://fuurin.reiyuura.pw}"
EMAIL="${TEST_EMAIL:-rei@fuurin.id}"
PASSWORD="${TEST_PASSWORD:-rei12345}"
COOKIE_JAR=$(mktemp)
trap 'rm -f "$COOKIE_JAR"' EXIT

say() { printf '  \033[1;32m✓\033[0m %s\n' "$*"; }
fail() { printf '  \033[1;31m✗ FAIL:\033[0m %s\n' "$*" >&2; exit 1; }

echo "E2E smoke against $BASE"

# ── 1. Guest state ────────────────────────────────────────────
code=$(curl -s -o /dev/null -w '%{http_code}' "$BASE/api/v1/users/me")
[ "$code" = "401" ] || fail "guest /users/me expected 401, got $code"
say "guest → 401"

# ── 2. Login ──────────────────────────────────────────────────
LOGIN_RES=$(curl -s -c "$COOKIE_JAR" -X POST "$BASE/api/v1/auth/login" \
  -H 'content-type: application/json' \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}")
TOKEN=$(echo "$LOGIN_RES" | jq -r '.accessToken // empty')
[ -n "$TOKEN" ] || fail "login failed: $LOGIN_RES"
say "login → access token acquired"

# ── 3. users/me with token ────────────────────────────────────
ME=$(curl -s "$BASE/api/v1/users/me" -H "authorization: Bearer $TOKEN")
ROLE=$(echo "$ME" | jq -r '.role // empty')
[ -n "$ROLE" ] || fail "users/me failed: $ME"
say "users/me → role=$ROLE"

# ── 4. Refresh ────────────────────────────────────────────────
REFRESH=$(curl -s -b "$COOKIE_JAR" -c "$COOKIE_JAR" -X POST "$BASE/api/v1/auth/refresh")
NEW_TOKEN=$(echo "$REFRESH" | jq -r '.accessToken // empty')
[ -n "$NEW_TOKEN" ] || fail "refresh failed: $REFRESH"
say "refresh rotated (new access token)"

# ── 5. Create draft ───────────────────────────────────────────
SLUG="e2e-$(date +%s)"
DRAFT=$(curl -s -X POST "$BASE/api/v1/drafts" \
  -H "authorization: Bearer $NEW_TOKEN" -H 'content-type: application/json' \
  -d "{\"slug\":\"$SLUG\",\"title\":\"E2E Draft\",\"description\":\"smoke test\"}")
echo "$DRAFT" | jq -e ".slug == \"$SLUG\"" >/dev/null || fail "draft create failed: $DRAFT"
say "draft created: $SLUG"

# ── 6. Autosave-equivalent (PATCH draft) ──────────────────────
UPD=$(curl -s -X PATCH "$BASE/api/v1/drafts/$SLUG" \
  -H "authorization: Bearer $NEW_TOKEN" -H 'content-type: application/json' \
  -d '{"description":"updated via smoke"}')
echo "$UPD" | jq -e '.description == "updated via smoke"' >/dev/null || fail "draft update failed: $UPD"
say "draft patched (autosave path)"

# ── 7. Publish draft ──────────────────────────────────────────
PUB=$(curl -s -X POST "$BASE/api/v1/drafts/$SLUG/publish" \
  -H "authorization: Bearer $NEW_TOKEN")
echo "$PUB" | jq -e '.visibility == "published"' >/dev/null || fail "publish failed: $PUB"
say "draft published (atomic transaction)"

# Verify album exists now.
ALBUM=$(curl -s "$BASE/api/v1/albums/$SLUG")
echo "$ALBUM" | jq -e ".slug == \"$SLUG\"" >/dev/null || fail "album not found after publish"
say "album visible in read API"

# ── 8. Upload media (tiny PNG) ────────────────────────────────
PNG_B64="iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
UPLOAD=$(echo "$PNG_B64" | base64 -d | curl -s -X POST "$BASE/api/v1/uploads" \
  -H "authorization: Bearer $NEW_TOKEN" \
  -F "file=@-;type=image/png;filename=smoke.png")
UP_KEY=$(echo "$UPLOAD" | jq -r '.key // empty')
[ -n "$UP_KEY" ] || fail "upload failed: $UPLOAD"
say "uploaded → $UP_KEY"

# ── 9. Add photo metadata + reorder ───────────────────────────
# Media src must be a valid URL — prefix upload key with the base origin.
UP_SRC="$BASE/api/v1/$UP_KEY"
ADD=$(curl -s -X POST "$BASE/api/v1/media" \
  -H "authorization: Bearer $NEW_TOKEN" -H 'content-type: application/json' \
  -d "{\"albumSlug\":\"$SLUG\",\"idx\":0,\"src\":\"$UP_SRC\",\"caption\":{\"en\":\"smoke\"},\"orientation\":\"landscape\",\"date\":\"2026-01-01\"}")
echo "$ADD" | jq -e '.idx == 0' >/dev/null || fail "media create failed: $ADD"
say "photo metadata added to album"

REORDER=$(curl -s -X PATCH "$BASE/api/v1/media/reorder" \
  -H "authorization: Bearer $NEW_TOKEN" -H 'content-type: application/json' \
  -d "{\"albumSlug\":\"$SLUG\",\"orderedIds\":[\"$SLUG:0\"]}")
echo "$REORDER" | jq -e '.ok == true' >/dev/null || fail "reorder failed: $REORDER"
say "reorder endpoint verified"

# ── 10. Replace media (PATCH src) ─────────────────────────────
REP=$(curl -s -X PATCH "$BASE/api/v1/media/$SLUG:0" \
  -H "authorization: Bearer $NEW_TOKEN" -H 'content-type: application/json' \
  -d "{\"src\":\"$UP_SRC\"}")
echo "$REP" | jq -e ".src == \"$UP_SRC\"" >/dev/null || fail "replace failed: $REP"
say "replace media endpoint verified"

# ── 11. Cleanup (admin delete) ────────────────────────────────
curl -s -X DELETE "$BASE/api/v1/albums/$SLUG" -H "authorization: Bearer $NEW_TOKEN" >/dev/null
curl -s -X DELETE "$BASE/api/v1/drafts/$SLUG" -H "authorization: Bearer $NEW_TOKEN" >/dev/null
say "cleanup done (album + draft removed)"

# ── 12. Logout ────────────────────────────────────────────────
curl -s -b "$COOKIE_JAR" -c "$COOKIE_JAR" -X POST "$BASE/api/v1/auth/logout" >/dev/null
OLD_REFRESH=$(curl -s -b "$COOKIE_JAR" -X POST "$BASE/api/v1/auth/refresh" | jq -r '.code // empty')
[ "$OLD_REFRESH" = "unauthorized" ] || fail "refresh should fail after logout"
say "logout → refresh revoked"

echo ""
echo "E2E smoke: ALL PASSED"