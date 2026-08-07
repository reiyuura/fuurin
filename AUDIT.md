# Project Audit Report

**Date:** 2026-08-07
**Scope:** Full stack — frontend (`src/`), backend (`backend/`), config/infra/docs
**Status:** ✅ All findings remediated (Phases 1–5 below)

> Supersedes the 2026-08-02 frontend-only component audit (token
> migration, Card/Dropdown extraction, etc. — still tracked separately).

---

## Executive Summary

**Overall health after remediation: Good ✅**

- ✅ `eslint` clean, `tsc --strict` clean (frontend + backend)
- ✅ 199 backend tests, 35+ frontend tests passing
- ✅ 2 CRITICAL auth-bypass vectors closed
- ✅ 6 HIGH integration bugs fixed
- ✅ 8 MEDIUM integrity issues fixed
- ⚠️ Accepted residuals documented at the bottom

---

## What was found & fixed

### 🔴 Critical (fixed)

**C1. Production ran with the publicly-known dev JWT secret.**
`backend/src/config/env.ts` defaulted `JWT_SECRET` to a hardcoded dev
string; the claimed production guard (`validateEnvironment()`) did not
exist, `validate-env.mjs` never checked it, and the production `.env`
did not set it → anyone could forge an admin token.

*Fix:* schema `superRefine` rejects the dev secret when
`NODE_ENV=production`; `validate-env.mjs` mirrors the rule;
`.env.example` documents it; a real secret was generated into
`backend/.env`; 4 regression tests added (`tests/env.spec.ts`).

**C2. Public admin credentials, auto-reset on every deploy.**
`seed.ts` hardcoded `rei12345` with `upsert({ update: { passwordHash } })`,
and `deploy.sh` seeds by default → the published README credential was
always live in production.

*Fix:* password comes from `SEED_ADMIN_PASSWORD`; re-seeds never touch
the password unless the var is explicitly set; production without an
existing admin + no var → hard error. Production admin password rotated
to a generated value (2026-08-07) and all sessions invalidated.

### 🟠 High (fixed)

1. **401-refresh URL malformed** — `api-client-provider.ts` built
   `…/apiv1/auth/refresh` (missing slash) → silent logout every ~15 min
   in production. Fixed via shared `buildApiBaseUrl()` helper now used by
   both the client and the refresh interceptor.
2. **Permission gate was a stub** — `use-require-auth.ts`
   `hasPermission = () => !!user` let `viewer` pass client-side gates.
   Now delegates to `lib/auth/permissions.ts` (helpers loosened to
   `RoleBearer` so `SessionUser` fits).
3. **Raw fetch bypassed the API client** — bulk delete in
   `editor/media/page.tsx` hardcoded `/api/v1/media/bulk` with no auth
   header → 401 in production. Now routed through `getApiClient()`.
4. **`deploy.sh` smoke gate self-contradiction** — expected `200` on the
   auth-guarded `/drafts`. Now expects `401`.
5. **Database dumps committed to git** — 3 `backups/*.dump` files were
   tracked. Untracked + `/backups/` added to `.gitignore` (files remain
   on disk).
6. **Upload MIME spoofing** — the client-supplied `mimetype` was trusted.
   Magic-byte sniffing (JPEG/PNG/WEBP) now rejects mismatched payloads;
   2 spoof tests added.

### 🟡 Medium (fixed)

- `draft-service.publish()` ignored the transaction `Result` → 200 on
  failure. Now checked.
- Refresh-token rotation was non-transactional (replay window +
  logout-on-failure). Now atomic `rotateSession` with replay detection.
- `requireAuth` trusted JWT claims only; deleted/demoted users kept
  access for up to 15 min. Now does a DB user lookup; the **current DB
  role wins** over the stale claim.
- `reorderMedia` was never audited; audit failures were swallowed
  silently → now logged to stderr; `entityId '(new)'` → real ids.
- Error responses leaked raw Prisma errors (`code/meta/clientVersion`)
  via `details.cause`. Stripped; `cause` is logged server-side only.
- Search silently covered only the first 100 albums
  (`MAX_CORPUS=500` vs `MAX_LIMIT=100` clamp). Now paginates the corpus.
- `createMember` TOCTOU: duplicate check outside the transaction, no DB
  constraint. `Member.nameJa` is now `UNIQUE` (migration
  `20260807000000_member_nameja_unique`, applied to both DBs) and the
  check runs inside the transaction.
- Mock route shadowing: `/albums/drafts/slugs` was swallowed by
  `/:slug`. Reordered (specific before parameterized).
- Mock-mode auth was unreachable while the login form advertised mock
  accounts. `SessionProvider` now hydrates/logs in via the mock provider
  in mock mode; the route gate (`proxy.ts`) skips the cookie check there.
- Save flow redirected to `/albums/[slug]/edit` (404 in fetch mode) →
  now mode-aware (`/editor/albums/[slug]` in fetch mode).

### 🔵 Low / hygiene (fixed)

- Next.js 16: `middleware.ts` → `proxy.ts` (deprecated convention).
- `<html lang>` was hardcoded `ja` while the default locale is `id`.
- Render-phase `router.replace()` in the login page moved into an effect.
- Dead code removed: `use-auth-session.ts`, `getSeedCredentials`,
  `defaultTokenResolver`, unused `result-helpers` combinators,
  `RequestDedupe.match()`, backend `src/api/contract.ts`, 5 scaffold
  SVGs + `reference.jpg` in `public/`, leftover `console.warn`.
- `bcryptjs` 2.4.3 (2019) → 3.0.3; `@types/bcryptjs` dropped (bundled).
- Root `package.json` gained `engines.node >=20`; `@types/node` aligned
  to ^22 (matches runtime Node 22).
- Frontend vitest include glob widened (`src/**/*.spec.ts`) so future
  tests outside `repositories/` actually run.
- Docs corrected: README (Next.js 16, dev-only credentials, CORS
  rationale, security section), RELEASE_NOTES (mock-auth claims),
  `verify-production.mjs` default port 3030, stale login-page copy.

### 🐛 Pre-existing infra issue discovered & fixed

The production `_prisma_migrations` table recorded
`20260803171145_audit_log` as **failed** (table existed, indexes missing)
— every `deploy.sh` migration step would have failed. The 3 missing
indexes were created manually, the migration marked resolved, and
`migrate deploy` is green again on both `fuurin` and `fuurin_test`.

---

## Accepted residuals (documented, not fixed)

- **CSP `script-src 'unsafe-inline'`** — required by the pre-hydration
  theme script; acknowledged in `security-headers.ts`.
- **`img-src https:`** is broad by design (external photo hosts).
- **Login timing oracle** (unknown email skips bcrypt compare) — minor
  user-enumeration signal; acceptable for a small class site.
- **Logout does not revoke the access token** — mitigated by the 15-min
  TTL + the new per-request DB check for deleted users.
- **No rate limit on public read/search** — in-memory search now bounds
  itself to a 500-item corpus; revisit if the corpus grows.
- **`Session` rows are never purged** after expiry (indexed; harmless).
- **Backend `AlbumRepository` draft methods** (`getDraft/createDraft/…`)
  remain: they are interface-declared and covered by
  `tests/repositories/album.spec.ts` — not dead code.
- **S3/R2/Null storage providers** stay as documented extension points.

---

## Verification commands

```bash
# frontend
npx tsc --noEmit && npm run lint && npx vitest run
# backend
cd backend && npx tsc -p tsconfig.json --noEmit && npx vitest run
```
