# Changelog

All notable changes to **Fuurin no Class** are documented in this file.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.0.0] — 2026-08-03 — First Official Release

The first stable release after three milestones of work. The repository is feature-complete for the planned scope and ready for production deployment.

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

#### Milestone C — Content Management & Backend Integration (Sprint 9–15)

- **Sprint 9 — Media Library.** Selection-mode grid, search debounce, lazy paginated load, filter chips.
- **Sprint 10 — Upload Pipeline.** Drag-and-drop or picker, MIME and size validation, per-item progress and retry, queue summary, lazy preview drawer, object-URL cleanup on unmount.
- **Sprint 11 — Album Editor.** Title, description, date, location, visibility; cover picker + multi-select photo picker with search/filter/sort; drag-and-drop reorder with keyboard fallback; draft / publish / delete with confirmation; `beforeunload` + internal-link unsaved guard.
- **Sprint 12 — Authentication.** Mock auth provider with seeded admin/editor accounts, `admin`/`editor`/`viewer` roles, permission constants in a single source of truth, role-based UI, route protection via `useRequireAuth` + `<ProtectedShell>`, login form with `aria-live` errors, cross-tab session sync.
- **Sprint 13 — Repository Layer.** Domain-only repository interfaces (`AlbumRepository`, `MediaRepository`, `UploadRepository`, `UserRepository`), one-way DTO → Domain mappers, singleton `repositories` registry, `RepositoryResult<T>` discriminated union, structured error model.
- **Sprint 14 — Backend API Integration.** `FetchApiClient` with `SessionAccessor` auth abstraction, request builder, response parser (JSON / 204 / non-JSON), error mapper, retry policy (GET only, max 2, jittered backoff), AbortController timeout, request dedupe for GET, sanitized structured logger.
- **Sprint 15 — Production Hardening.** Fail-fast environment validation (instrumentation startup gate, prebuild/prestart script, runtime error mapping), security headers (CSP, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy, COOP), segment + global error boundaries with chunk-load detection, consistent 401/403/404/500 status pages, `/api/health` JSON probe, sitemap + robots, Open Graph + Twitter card metadata, replaceable monitoring adapter, accessibility + bundle + image + boundary audits.

### Changed

- Image rendering consolidated to `next/image` with explicit `sizes` and `fill` — every photo card, hero, sidebar thumbnail, search result, and avatar.
- Object URLs in the upload worker moved to a dedicated ref-tracked set; no ref reads or mutations during render.
- Failed env validation in production aborts startup before any repository or provider is instantiated.

### Security

- Environment variables no longer read ad-hoc — all consumers call `getEnvironment()` which throws on invalid production config.
- Authorization header injected by `SessionAccessor` adapter; logger redacts `Authorization`, `token`, `password`, `secret`, `cookie`, `session` keys before serialization.
- Content Security Policy allows the validated API origin in `connect-src`, sets `frame-ancestors 'none'`, and upgrades insecure requests in production.

### Notes

- No breaking changes — this is the first stable release; pre-1.0 history is documented in git history and milestone reports.
- Mock auth and mock API store are intentional for the v1.0.0 milestone; backend integration is the next milestone.
- See [RELEASE_NOTES.md](./RELEASE_NOTES.md) for the public release narrative.

[Unreleased]: https://github.com/fuurin/fuurin-album/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/fuurin/fuurin-album/releases/tag/v1.0.0