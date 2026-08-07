# Changelog

All notable changes to **Fuurin no Class** are documented in this file.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Security

- **Production no longer boots with the public dev JWT secret** — a
  schema `superRefine` rejects the default when `NODE_ENV=production`,
  `validate-env.mjs` mirrors the rule, and `.env.example` documents it.
  (Previously the comment claimed a guard that didn't exist; production
  ran with a repo-known secret → full auth bypass. Rotated 2026-08-07.)
- **Seed no longer resets the admin password on every deploy** —
  credentials come from `SEED_ADMIN_PASSWORD`; production re-seeds leave
  the account untouched. Production admin password rotated.
- **Upload content sniffing** — magic-byte validation (JPEG/PNG/WEBP)
  rejects payloads whose bytes don't match the client-claimed MIME type.
- **`requireAuth` verifies the user in the database** on every request —
  deleted/demoted accounts lose access immediately instead of living out
  the access-token TTL; the current DB role wins over stale JWT claims.
- **Refresh-token rotation is atomic** (single transaction) with replay
  detection — a concurrently-presented or replayed old token is rejected
  instead of minting a second session.
- **Error responses no longer leak raw Prisma errors** (`code`, `meta`,
  `clientVersion`) via `details.cause`; the diagnostic is logged
  server-side only.
- Database backup dumps untracked from git; `/backups/` gitignored.

### Fixed

- **401-refresh interceptor URL** was malformed (`…/apiv1/auth/refresh`),
  silently killing sessions at access-token expiry in production.
- **Client-side permission gates were a stub** (`hasPermission = () =>
  !!user`) — viewers passed; now delegates to `lib/auth/permissions`.
- **Media bulk delete** bypassed the API client (no auth header) → 401.
- **Photo reorder could never swap positions** — mid-transaction `idx`
  updates collided with `@@unique(albumSlug, idx)`. Two-phase reindex.
- **`publish()` swallowed transaction failures** (200 on failure).
- **Search silently covered only the first 100 albums** (pagination
  clamp vs corpus size); now pages through the corpus.
- **`createMember` TOCTOU** — duplicate check outside the transaction;
  `Member.nameJa` is now `UNIQUE` (migration
  `20260807000000_member_nameja_unique`).
- **`reorderMedia` was never audited**; audit failures no longer silent;
  audit `entityId` uses real ids instead of `'(new)'`.
- **Mock-mode login** worked again in dev (session provider + route
  gate), matching the demo credentials shown on the login form.
- **Mock route shadowing** — `/albums/drafts/slugs` was swallowed by
  `/:slug` (first-match-wins); specific routes register first now.
- **Save flow redirect** no longer lands on a 404 route in fetch mode.
- **`deploy.sh` smoke gate** — `/drafts` correctly expects 401, and the
  `/editor/media` check expects the proxy redirect (307) instead of 200.
- **Production `_prisma_migrations` recorded a failed migration**
  (`20260803171145_audit_log`: table existed, 3 indexes missing) that
  would have failed every deploy's migrate step — resolved and applied.
- Render-phase `router.replace()` in the login page moved into an effect.

### Changed

- Next.js 16 convention: `src/middleware.ts` → `src/proxy.ts`.
- `<html lang>` matches the default locale (`id`, was hardcoded `ja`).
- `bcryptjs` 2.4.3 → 3.0.3 (dropped `@types/bcryptjs`, bundled now).
- Root `package.json` declares `engines.node >=20`; `@types/node` ^22.
- Frontend vitest include glob widened to `src/**/*.spec.ts`.
- Docs corrected: README (Next.js 16, dev-only credentials, CORS
  rationale), RELEASE_NOTES (real auth), `verify-production.mjs`
  default port 3030; `AUDIT.md` rewritten with the full-stack audit.

### Removed

- Dead code: `use-auth-session.ts`, `getSeedCredentials`,
  `defaultTokenResolver`, unused `result-helpers` combinators,
  `RequestDedupe.match()`, backend `src/api/contract.ts`, scaffold SVGs
  + `reference.jpg` in `public/`, leftover `console.warn`.

### Added

- 13 `FetchApiClient` unit tests (URL building, auth injection, GET
  dedupe, retry policy, 401-refresh-retry, timeout, network mapping).
- Draft-routes integration spec (CRUD + publish + guard matrix),
  refresh-replay-under-concurrency test, reorder audit test, error-leak
  guard test, upload MIME-spoof tests (2), production JWT-secret
  rejection tests (4).

## [1.0.0] — 2026-08-04 — Production Release

First stable production release. Full-stack album CMS with authentication,
authorization, editor workspace, draft publishing, media library, and
deployment automation.

### Added

#### Milestone A — Foundations (Sprint 1–4)

- Application shell with header, footer, tab bar, and sticky navigation.
- Album grid with hover-print effect and language-aware captions.
- Photo viewer with inline preview, prev/next navigation, tag chips, copy-link, share.
- Timeline page with date-sorted class story highlights.
- Members + favorites + about pages.
- Search palette across albums, photos, members, timeline, and history.
- Theme switch (warm light / warm dark), three-locale dictionary (ja/id/en), localStorage persistence.

#### Milestone B — Album Experience (Sprint 5–8)

- Album detail page with cover, metadata, tag filter, favorite toggle, infinite-scroll grid, related albums.
- Album explorer with category filter, year/month filter, tag filter, and sort options.
- Photo deep-link route with thumbnail strip, share, and copy-link.
- Favorites gallery using the explorer layout.

#### Milestone C — Content Management & Frontend Hardening (Sprint 9–15)

- Media Library selection-mode grid, search debounce, lazy paginated load, filter chips.
- Upload pipeline: drag-and-drop, MIME and size validation, per-item progress and retry, queue summary.
- Album Editor: title, description, date, visibility, cover picker, photo picker, drag-and-drop reorder.
- Mock authentication with seeded admin/editor accounts, role-based UI, route protection.
- Repository layer with domain-only interfaces, DTO → Domain mappers, `RepositoryResult<T>`.
- `FetchApiClient` with `SessionAccessor` auth, retry policy, AbortController timeout, request dedupe.
- Fail-fast environment validation, security headers (CSP, X-Frame-Options, etc.), error boundaries.

#### Milestone D — Backend & Production Foundation (Sprint 16–25)

- **Sprint 16–18 — Read/Write API.** Fastify 5 backend, Prisma ORM, PostgreSQL.
  Layered: Route → Controller → Service → Repository. Full read API
  (albums, media, members, timeline, search). Full write API (CRUD for
  albums, media, timeline, members) with Zod validation.
- **Sprint 19 — Authorization & Audit.** JWT auth (access + refresh),
  `requireAuth` + `requireRole` middleware, session table with rotation,
  `AuditLog` table recording every write mutation post-commit.
- **Sprint 20A–D — Session & Stats.** `FetchAuthRepository`, `SessionProvider`
  with mount-time refresh → currentUser → authenticated/guest flow. `GET /stats`
  public endpoint (totalAlbums, totalPhotos, totalMembers, totalTimelineEntries).
- **Sprint 21 — Editor Workspace.** `/editor` layout with responsive sidebar,
  album CRUD UI, cover upload integration, create/edit/delete with confirmation
  dialog, permission-aware UI (viewer/editor/admin), optimistic updates.
- **Sprint 22 — Media Library.** Grid view, multi-file parallel upload (max 3
  concurrent), retry per file, bulk select + delete (admin), `DELETE /media/bulk`,
  `PATCH /media/reorder`, image viewer modal with zoom/next/prev.
- **Sprint 23–23.5 — Draft & Publishing.** `AlbumDraft` entity (draft/published/
  archived), full draft CRUD API, atomic publish via `Prisma.$transaction`
  (create/update Album + update Draft in single transaction), editor UI with
  draft list, autosave (2s debounce), unsaved changes warning (`beforeunload`),
  internal preview, cover upload before save.
- **Sprint 24–24.5 — Editor Polish.** Toast notification system (success/error/
  info, ARIA live region), keyboard shortcuts (Ctrl+S, Ctrl+P, Esc), breadcrumb
  navigation, `@dnd-kit` drag-and-drop reorder with keyboard support, replace
  media, attach media to album, focus trap + restore on all dialogs.
- **Sprint 25 — Release Candidate.** tsc 0 errors, ESLint 0 warnings, security
  headers (CSP, X-Content-Type-Options, X-Frame-Options, Referrer-Policy,
  Permissions-Policy), rate limiting (login 10/min/IP, upload 30/min/IP),
  `useFocusTrap` hook, `deploy.sh` (migrate → seed → build → restart → smoke),
  `backup.sh`/`restore.sh` (pg_dump/restore), `scripts/smoke-e2e.sh` (14-step
  end-to-end), README documentation, critical test database isolation fix
  (`fuurin_test` pinning to prevent production data truncation).

### Changed

- Repository architecture: all data flows through Page → Feature Hook →
  Repository → FetchApiClient → Backend. No direct `fetch()` in components.
- Publish is atomic: `Prisma.$transaction` creates/updates Album and sets
  Draft visibility in a single commit — no partial publish.
- Upload is parallel: max 3 concurrent workers with per-file retry (2 retries,
  exponential backoff) — no batch rollback on individual failure.
- Cookie auth: refresh cookie `path: '/'` (was `/api/v1/auth`), `credentials:
  'include'` on all requests, `injectAuthHeaders` calls `resolveToken` even
  when session is null (fetch mode reads from in-memory token store).
- Editor routes protected by Next.js middleware: guests redirected to
  `/login?next=...` — backend API still enforces auth independently.

### Fixed

- Login persistence: three root causes fixed — `credentials: 'omit'` →
  `'include'`, `injectAuthHeaders` skipping `resolveToken` when session null,
  cookie path too narrow (`/api/v1/auth` → `/`).
- Draft authorization: `GET /drafts` and `GET /drafts/:slug` were public —
  added `preHandler: [requireAuth, requireRole('admin', 'editor')]`.
- Editor guest access: `/editor/*` accessible without login — added
  `src/middleware.ts` with cookie presence check + redirect.
- Test database isolation: `getTestPrisma()` honored `process.env.DATABASE_URL`
  (production) over fallback, causing `truncateAll()` to wipe production data
  on every `vitest run` — pinned to `fuurin_test` via `pinTestDatabaseEnv()`.
- Backend seed: `bcrypt.hash` ESM interop (`'default' in module` check) —
  seed failed silently in production, leaving zero users.
- Stale PM2 process: `npm run build` without `pm2 restart` caused chunk
  404 → hydration failure → page rendered but non-interactive — documented
  in README deployment rules.

### Security

- CSP: `default-src 'self'` (page), `default-src 'none'` (API JSON).
- Cookies: HttpOnly, Secure (prod), SameSite=Lax, path `/`.
- Rate limits: login/refresh 10/min/IP, upload 30/min/IP (disabled in test).
- Zod validation on every write payload.
- Upload: MIME whitelist, size cap, filename sanitization, path traversal protection.
- SQL injection: Prisma parameterized queries; sort param validated by Zod enum.
- Auth bypass: all write endpoints return 401 without Bearer token.
- Draft routes: editor/admin only (fixed in release blocker verification).

[Unreleased]: https://github.com/fuurin/fuurin-album/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/fuurin/fuurin-album/releases/tag/v1.0.0
