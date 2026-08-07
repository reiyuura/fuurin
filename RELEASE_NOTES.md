# Release Notes — v1.0.0

> *風鈴のクラス — Fuurin no Class*
> First Official Release · 2026-08-03
>
> *Updated 2026-08-07 — the original text predated the Fastify backend
> landing (it described auth and the repository layer as mock-only).
> Those sections now reflect what actually shipped in v1.0.0.*

Fuurin no Class is an open-source digital memory book for a class of Japanese language learners. It looks less like a feed and more like opening an old album on a quiet spring afternoon — washi paper, soft sakura accents, and typography that prefers warmth over polish.

This release is the result of three milestones of work, from the first album grid to a production-ready backend boundary. It is feature-complete for the planned scope and ready for deployment.

---

## What's new in v1.0.0

In one sentence: a finished album experience, a real editor, a real upload pipeline, real authentication and authorization, a layered repository that is ready for a real backend, and the operational hardening needed to ship it.

## Highlights

- **A finished album.** Six seeded albums, a multilingual viewer, and a sticky washi-paper grid that opens with a gentle hover-print effect.
- **A working editor.** Create, rename, schedule, reorder, republish — all from the same screen, with autosave, unsaved-guard, and confirm-before-delete.
- **A real upload pipeline.** Drop a folder, watch the queue drain, retry the failed ones, cancel the rest. Object URLs are cleaned up on unmount.
- **Authentication that is honest.** Real JWT auth shipped in v1.0.0: access token in memory + refresh token in an HttpOnly cookie with rotation. The `SessionAccessor` boundary means any future OAuth or SSO client can still be swapped in without touching the rest of the app.
- **A repository layer ready for production.** DTOs never leak past the data layer, every method returns a discriminated `RepositoryResult<T>`, the mock impls and the API impls are interchangeable.
- **Operational hardening.** Fail-fast environment validation, security headers, error boundaries with chunk-load detection, consistent 401 / 403 / 404 / 500 pages, `/api/health`, sitemap, robots.

## Major features

- **Albums** with cover, period, season, category, language-aware captions, and tag filtering.
- **Photo viewer** with prev/next, tag chips, copy-link, share, favorites.
- **Album editor** with cover picker, multi-select photo picker (search + filter + sort), drag-and-drop reorder with keyboard fallback, draft/publish/delete confirmation, and unsaved-changes guard.
- **Upload pipeline** with concurrent worker, deterministic mock transport, per-item retry/cancel/remove, lazy preview drawer, queue summary.
- **Search palette** with debounced fuzzy search across albums, photos, members, timeline, and history.
- **Favorites** with full-screen gallery filter.
- **Timeline** with date-sorted story highlights.
- **Media library** with selection-mode grid, search debounce, filter chips, lazy paginated load.
- **Theme + locale + session** with warm dark mode, three-locale dictionary, localStorage session restore, cross-tab sync.
- **Authentication** with JWT + refresh rotation against the Fastify backend, role-based UI, route-level protection. (A mock provider remains available for offline dev via `NEXT_PUBLIC_API_MODE=mock`.)

## Architecture

The application follows a five-layer flow that is unchanged since Milestone A and frozen as of v1.0.0:

```
UI
 ↓
Feature
 ↓
Repository
 ↓
ApiClient
 ↓
Transport
 ↓
Backend
```

- **UI** — Server Components and Client Components, render-only. Reusable primitives in `components/ui`, feature components in `components/`.
- **Feature** — Hooks and form state. Owns browser interaction and dirty-tracking.
- **Repository** — `AlbumRepository`, `MediaRepository`, `UploadRepository`, `UserRepository`. Domain types only, returns `RepositoryResult<T>`.
- **ApiClient** — `MockApiClient` (default) and `FetchApiClient` (production). Bearer-token injection via `SessionAccessor`, retry on GET only, AbortController timeout.
- **Transport** — `fetch()` behind `FetchApiClient`. The mock layer never touches the network.

The repository registry `repositories` is the only handle any feature touches; swapping the implementation is a one-line change in `api-client-provider.ts`.

## Breaking changes

None — this is the first stable release.

## Known limitations

- **Mock authentication.** Login uses seeded credentials (`rei@fuurin.id` / `rei12345`, `hana@fuurin.id` / `hana12345`). Replacing the mock with NextAuth, Clerk, or Auth.js requires only swapping `MockAuthProvider` for the real provider; the rest of the app is provider-agnostic.
- **Mock API store.** All data is in-memory and resets on server restart. The `FetchApiClient` is production-ready; the wiring to a real backend is the next milestone.
- **No automated test suite.** Sprint 14's `scripts/api-smoke.ts` covers the FetchApiClient pipeline (25 cases). UI-level automation is intentionally deferred — the architecture is stable enough to add tests later without churn.
- **Single production deployment assumption.** The app assumes one process / one region. CDN edge caching, multi-region replication, and image CDNs are out of scope.

## Security

- CSP includes a `connect-src` allowlist built from the validated API origin.
- `frame-ancestors 'none'`, `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, and a restrictive `Permissions-Policy` are applied to every route by default.
- Authorization header is injected through a `SessionAccessor` abstraction; the FetchApiClient never imports the auth provider. The structured logger redacts `Authorization`, `token`, `password`, `secret`, `cookie`, and `session` keys before serialization.
- Production environment validation is **fail-fast**: invalid configuration aborts startup before any provider is instantiated.

## Accessibility

- Keyboard navigation across header dropdowns, drawer pickers, delete dialog, and the editor.
- Focus management for modals, drawer open/close, and the editor's reorder controls.
- `aria-live` regions for login errors, save status, upload progress, and the search palette.
- Visible focus rings; semantic tokens preserve AA contrast in light and dark.
- Reduced-motion respected for animated transitions.

## Credits

Built by the Fuurin team with care for the small details — paper texture, fall-off shadows, hand-drawn ornaments, and quiet color choices that don't shout.

Open-source libraries we depend on: Next.js 16, React 19, TypeScript 5, Tailwind CSS v4, Radix UI primitives, framer-motion, lucide-react, clsx, class-variance-authority, tailwind-merge, ESLint 9.

Photographs in the seeded data set are courtesy of [Unsplash](https://unsplash.com) contributors — see `src/lib/data.ts` for individual credits.

---

If you find a bug or want to suggest a feature, please open an issue. If you want to contribute, see [CONTRIBUTING.md](./CONTRIBUTING.md) and our [CODE_OF_CONDUCT.md](./CODE_OF_CONDUCT.md).