# Fuurin no Class — 風鈴のクラス

[![Version](https://img.shields.io/badge/version-1.0.0-c87c8d)](CHANGELOG.md)
[![License: MIT](https://img.shields.io/badge/license-MIT-7A9E7E)](LICENSE)
[![Next.js](https://img.shields.io/badge/Next.js-16-000000)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6)](https://www.typescriptlang.org)
[![React](https://img.shields.io/badge/React-19-149ECA)](https://react.dev)

An open-source digital memory book for a class of Japanese language learners — designed to feel like opening an old album on a spring afternoon. Warm washi paper, soft sakura accents, and quiet typography in place of a typical SaaS dashboard.

The repository at v1.0.0 represents the first official release after three milestones of work:

- **Milestone A — Foundations.** Album grid, photo viewer, timeline, search.
- **Milestone B — Album experience.** Album detail, exploration, photo navigation.
- **Milestone C — Content management & backend integration.** Album editor, upload pipeline, mock authentication, repository layer, fetch-ready API client, production hardening.

For the full release story, see [RELEASE_NOTES.md](./RELEASE_NOTES.md). For every change since the project started, see [CHANGELOG.md](./CHANGELOG.md).

---

## Table of contents

- [Highlights](#highlights)
- [Features](#features)
- [Tech stack](#tech-stack)
- [Architecture overview](#architecture-overview)
- [Folder structure](#folder-structure)
- [Installation](#installation)
- [Development](#development)
- [Environment variables](#environment-variables)
- [Production deployment](#production-deployment)
- [Scripts](#scripts)
- [License](#license)

---

## Highlights

- **A memory book, not a feed.** Photo-first grid + traditional album covers instead of card walls and badges.
- **Album editor with cover + photo picker.** Drag-and-drop reorder, keyboard fallback, real-time dirty-state tracking with `beforeunload` and internal-link guard.
- **Upload pipeline.** Concurrent worker, deterministic mock transport, per-item retry/cancel/remove, ObjectURL cleanup on unmount.
- **Mock authentication with permission gating.** `admin` / `editor` / `viewer` roles, permission constants in a single source of truth, role-based UI in header and routes.
- **Production-ready repository layer.** Domain types never leak DTOs, error model is shared, every method returns a discriminated `RepositoryResult<T>`.
- **Fetch-ready API client.** Bearer-token injection via `SessionAccessor`, retry policy for GET only, AbortController timeout, JSON / 204 / non-JSON response handling, structured logger with sensitive-value redaction.
- **Hardened for deployment.** Fail-fast environment validation, segment + global error boundaries, consistent 401 / 403 / 404 / 500 status pages, `/api/health` JSON probe, sitemap + robots, security headers (CSP, `frame-ancestors 'none'`, `X-Frame-Options: DENY`, `Permissions-Policy`).

## Features

- **Albums.** Curated collections with cover, period, season, category, language-aware L10n captions.
- **Photo viewer.** Inline preview, prev/next navigation, tag chips, copy-link, share, favorite toggle.
- **Album editor.** Title, description, date, location, visibility, cover picker, multi-select photo picker with search + filter + sort, drag-and-drop reorder with keyboard fallback, draft / publish / delete with confirmation.
- **Upload pipeline.** Drag-and-drop or file picker, MIME and size validation, per-item progress and retry, queue summary, lazy preview drawer.
- **Search palette.** Multi-source fuzzy search over albums, photos, members, timeline, recent history.
- **Favorites.** Local-first photo favorites with full-screen gallery filter.
- **Timeline.** Class story highlights sorted by date.
- **Media library.** Selection-mode grid, search debounce, filter chips, lazy paginated load.
- **Theme + locale + session.** Dark mode with warm palette, three-locale dictionary, localStorage session restore + cross-tab sync.
- **Authentication.** Mock login form with seeded admin / editor accounts; route-level protection via `useRequireAuth` + `<ProtectedShell>`.
- **Monitoring + health.** Console adapter with sanitized context, replaceable via `setMonitoringAdapter`. `/api/health` returns uptime/version/environment/timestamp with `no-store`.

## Tech stack

| Layer            | Choice                                                       |
| ---------------- | ------------------------------------------------------------ |
| Framework        | Next.js 16 (App Router, Turbopack)                            |
| Language         | TypeScript 5                                                 |
| UI               | React 19, Tailwind CSS v4, Radix UI primitives, framer-motion |
| Icons            | lucide-react                                                 |
| Class utilities  | clsx, class-variance-authority, tailwind-merge               |
| Linting          | ESLint 9 with `eslint-config-next`                           |
| Build            | Next.js production build + Turbopack                         |
| Runtime          | Node.js (process.uptime in `/api/health`)                    |

## Architecture overview

```text
            ┌────────────┐
            │    UI     │  Server Components + Client Components, render-only
            └─────┬──────┘
                  │ events / state
            ┌─────▼──────┐
            │  Feature  │  Hooks (useAlbumEditor, useRequireAuth, useUploadWorker), form state
            └─────┬──────┘
                  │ await repositories.X.method()
            ┌─────▼─────────────┐
            │ Repository        │  Interface + Mock impl per Sprint 13
            │  (interface +     │  Returns RepositoryResult<T>; domain types only
            │   implementation) │
            └─────┬─────────────┘
                  │ apiClient.request()
            ┌─────▼─────────────────┐
            │  ApiClient (interface) │
            └─────┬─────────────────┘
                  │
        ┌─────────┴──────────┐
        │                    │
┌───────▼────────┐  ┌────────▼──────────┐
│ MockApiClient  │  │ FetchApiClient    │  Bearer auth, retry, timeout, sanitized logger
│  (Sprint 13)  │  │   (Sprint 14)     │
└────────────────┘  └─────────┬──────────┘
                              │ fetch + AbortController
                       ┌──────▼──────┐
                       │  Transport  │  REST API / Backend (Sprint 15+ deployment)
                       └─────────────┘
```

The repository layer is the single data boundary. Sprint 14 introduced `FetchApiClient`; Sprint 15 introduced the production hardening (security headers, monitoring, fail-fast env). No future feature work touches these layers without first opening a new sprint.

## Folder structure

```
.
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── page.tsx
│   │   ├── layout.tsx
│   │   ├── error.tsx           # segment error boundary
│   │   ├── global-error.tsx    # root error boundary
│   │   ├── not-found.tsx
│   │   ├── sitemap.ts
│   │   ├── robots.ts
│   │   ├── api/
│   │   │   └── health/route.ts # /api/health
│   │   ├── forbidden/page.tsx  # 403
│   │   ├── unauthorized/page.tsx # 401
│   │   ├── albums/             # public albums
│   │   ├── media/              # media library
│   │   ├── upload/             # upload pipeline (gated)
│   │   ├── favorites/          # favorites gallery (gated)
│   │   ├── login/              # auth entry
│   │   └── ...
│   ├── components/             # UI components
│   │   ├── ui/                 # button, card, photo-grid, dropdown, ...
│   │   ├── layout/             # header, footer, tab-bar
│   │   ├── home/               # hero, featured, recent, sidebar
│   │   ├── albums/             # album-detail, albums-explorer
│   │   ├── media/              # media-explorer, media-details
│   │   ├── upload/             # upload workspace
│   │   ├── editor/             # album editor
│   │   ├── auth/               # session-provider, auth-guard, login-form, user-menu, role-badge
│   │   ├── system/             # status-page, error-fallback
│   │   └── ...
│   ├── hooks/                  # feature hooks
│   ├── lib/
│   │   ├── api/                # fetch-api-client + pipeline modules (Sprint 14)
│   │   ├── auth/               # mock auth provider, permissions, session storage
│   │   ├── config/             # env validation, security-headers builder
│   │   ├── monitoring/         # monitoring adapter + console adapter + provider
│   │   ├── repositories/       # repository interfaces, mock impls, registry, DTO mappers
│   │   └── ...                 # data, i18n, theme, search, favorites, ...
│   ├── types/                  # shared types (auth, repository, media, api-config, ...)
│   └── instrumentation.ts      # Next.js startup gate (fail-fast env validation)
├── scripts/                    # audit + verification scripts (see Scripts section)
├── public/                     # static assets (decor SVGs, etc.)
├── next.config.ts              # security headers, image remotePatterns
├── tsconfig.json
├── eslint.config.mjs
├── .env.example                # documents required env vars
└── package.json
```

## Installation

```bash
git clone <repository-url> fuurin-album
cd fuurin-album
npm install
```

Node.js 22+ and npm 10+ are recommended (matches Next.js 16 expectations).

## Development

```bash
npm run dev               # http://localhost:3000 (Next dev server)
npm run typecheck         # strict TypeScript pass
npm run lint              # ESLint
npm run audit:images      # raw <img>, missing alt/sizes audit
npm run audit:boundaries  # direct fetch/mock imports outside the data layer
npm run smoke:api         # 25-case FetchApiClient pipeline smoke
```

The app uses a **mock auth provider** and a **mock API store** by default. Seeded accounts:

| Email             | Password   | Role   |
| ----------------- | ---------- | ------ |
| rei@fuurin.id     | rei12345   | admin  |
| hana@fuurin.id     | hana12345  | editor |

Mock state resets every server restart (intentional for Sprint 1–15; a real backend is the next milestone).

## Environment variables

All variables are documented in [`.env.example`](./.env.example). Required groups:

```text
API_MODE            # 'mock' (default) or 'fetch'
API_BASE_URL        # required when API_MODE=fetch; production requires HTTPS
API_VERSION         # e.g. 'v1' (optional)
API_TIMEOUT         # integer 1000-120000 ms; default 15000
SITE_URL            # absolute http(s) origin for sitemap, robots, OG, canonical
RELEASE             # version identifier emitted in health + monitoring
```

Validation is **fail-fast** in production: `instrumentation.register()` runs before the app accepts requests. Invalid configuration in production throws and the process exits.

## Production deployment

```bash
NODE_ENV=production API_MODE=fetch \
  API_BASE_URL=https://api.example.com \
  API_TIMEOUT=15000 \
  SITE_URL=https://fuurin.example.com \
  RELEASE=1.0.0 \
  npm run build

NODE_ENV=production npm run start
```

The deployment process should:

1. Verify environment with `npm run validate:env` (also runs as `prebuild` and `prestart`).
2. Build with `npm run build`.
3. Start the server with `npm run start`.
4. Probe liveness with `GET /api/health` (returns 200 + JSON `{status, version, uptime, environment, timestamp}`).
5. Run `npm run verify` against the deployed host (it requires security headers, sitemap, robots, health).

For PM2:

```bash
pm2 start npm --name fuurin-album -- run start
pm2 save
```

Security headers applied by default: `Content-Security-Policy`, `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy`, `Cross-Origin-Opener-Policy: same-origin`.

## Scripts

| Script                | Purpose                                                                          |
| --------------------- | -------------------------------------------------------------------------------- |
| `npm run dev`         | Start Next.js development server                                                |
| `npm run validate:env`| Validate env variables (also runs as `prebuild` and `prestart`)                |
| `npm run build`       | Production build (runs `validate:env` first)                                     |
| `npm run start`       | Start Next.js production server (runs `validate:env` first)                      |
| `npm run typecheck`   | `tsc --noEmit` over the project (excludes `scripts/`)                            |
| `npm run lint`        | ESLint via `eslint-config-next`                                                  |
| `npm run audit:images`| Detect raw `<img>`, missing `alt`/`sizes` on `next/image`                       |
| `npm run audit:boundaries` | Forbid `fetch()` and mock imports outside the data layer                   |
| `npm run smoke:api`   | 25-case FetchApiClient pipeline smoke (URL, auth, retry, timeout, logger)        |
| `npm run verify`      | End-to-end route + header + health probe against a running deployment             |

## License

Released under the [MIT License](./LICENSE). See [LICENSE](./LICENSE) for the full text.