# Sprint 16 — Backend Foundation: Implementation Plan

> **Status:** DRAFT — awaiting approval. **No code written yet.**
> **Scope:** Architecture design only. No endpoints, no migrations, no auth, no file upload this sprint.
>
> **For Hermes:** after approval, implement task-by-task below using subagent-driven-development.

## Header

- **Goal:** Design the backend target that `FetchApiClient` will talk to, grounding every decision in the *actual* frontend contract so the backend is implementable in Sprints 17–20 without changing frontend code.
- **Architecture:** API-first, layered backend that mirrors the frontend repository boundary. Single language (TypeScript) to share types; framework-pluggable core; PostgreSQL 16 (already on host) via Prisma.
- **Tech stack (recommended):** Node 24 + Fastify, TypeScript 5, Prisma ORM, PostgreSQL 16, Zod validation, JWT access + rotating refresh, PM2 (already in use on host).
- **Constraint:** The frontend's repository contracts are **FINAL**. The backend must answer to the route shapes, query envelope, error model, and field names the frontend already emits.

---

## 0. Grounding: The Frontend Contract (source of truth)

Every backend decision below is derived from these files (do not contradict them):

| Contract | Location |
|---|---|
| Route table (de-facto wire contract) | `src/lib/repositories/mock-api-client.ts` (ROUTES) |
| Query envelope → URLSearchParams | `src/lib/api/query-builder.ts` (`toQueryParams`) |
| HTTP status → error code | `src/lib/api/error-mapper.ts` (`STATUS_TO_CODE`) |
| Response parsing (JSON/204/non-JSON) | `src/lib/api/response-parser.ts` |
| ApiClient request/response shapes | `src/lib/repositories/api-client.ts`, `src/types/api-config.ts` |
| Auth contract | `src/types/auth.ts`, `src/lib/auth/permissions.ts`, `src/lib/api/session-accessor.ts` |
| DTOs (wire types) | `src/types/repository-dtos.ts` |
| Repository interfaces | `src/lib/repositories/*-repository.ts` |
| Retry policy | `src/lib/api/retry-policy.ts` |

### Non-negotiable wire rules (must match exactly)

1. **Base URL + version + path.** `FetchApiClient` builds `${baseUrl}${version}${path}?${query}`.
   `version` is `''` or starts with `/` (e.g. `/v1`). Backend mounts API under `/v1`.
2. **Query envelope** (URL-encoded, from `toQueryParams`):
   - `page` (0-based), `limit` (≥1)
   - `sort` = `key:dir` or comma-joined `a:asc,b:desc`
   - any filter field as a bare query param (`album=slug`, `tag=value`, `category=…`)
   - `q` (search), `fields` = comma-joined field list for search
3. **Auth header:** `Authorization: Bearer <token>` injected by `SessionAccessor`; `session.token?.` shape.
4. **Request id:** client sends `X-Request-Id`; backend must return it (or echo) for correlation.
5. **Success bodies** are plain JSON; **204 No Content** for void deletes; all 2xx must parse as JSON unless 204.
6. **Error bodies** are JSON `{ message: string }` (frontend reads `message`). Status codes drive the error code:
   `400/422→validation`, `401→unauthorized`, `403→forbidden`, `404→not_found`, `409→conflict`, `429→transport`, `5xx→transport`.

### Route inventory the backend must eventually serve (from `mock-api-client.ts`)

```
GET    /albums
GET    /albums/summaries
GET    /albums/:slug
GET    /albums/:slug/photos
GET    /albums/:slug/photos/:idx
GET    /albums/timeline
POST   /albums/drafts
GET    /albums/drafts/:slug
PATCH  /albums/drafts/:slug
DELETE /albums/drafts/:slug
GET    /albums/drafts/slugs
GET    /media
GET    /members
GET    /users/me
PATCH  /users/me
GET    /uploads
POST   /uploads
DELETE /uploads/:id
DELETE /uploads (clear all)
```

> Sprints 17–18 implement the **read** routes; Sprint 19 the **write/draft** routes; Sprint 20 the **upload + auth** routes. Sprint 16 only lays the foundation (repo scaffold, config, logging, error envelope, health, contract test harness) — no business routes.

---

## 1. Backend Architecture

```
        client (Next.js / FetchApiClient)
                    │  HTTPS JSON (bearer, X-Request-Id)
                    ▼
┌─────────────────────────────────────────────┐
│                 Fastify App                │
│  ┌───────────┐ ┌──────────┐ ┌──────────┐  │
│  │  Routes   │→│  Services │→│  Repos   │  │
│  │ (Framework │ (domain/    │ (Prisma)  │  │
│  │  handlers)  │  use cases) │           │  │
│  └───────────┘ └──────────┘ └──────────┘  │
│  │ Validation (Zod) │ Auth (JWT guard)    │
│  │ Plugins: logger, error, routing        │
└─────────┬─────────────────────────────────┘
          │
   ┌──────┴───────────┐
   │ PostgreSQL 16    │   persistent store (Prisma)
   └──────────────────┘
```

- **Routes = thin.** Parse + validate + delegate to a service. No business logic in routes.
- **Services = domain/use cases.** Contain business rules, return domain-shaped results.
- **Repositories = data access only.** Prisma calls; no HTTP concerns.
- **Error boundary = global plugin.** Converts any thrown error into the `{ message }` JSON + correct status.
- **Result type parity.** Backend uses a `Result<T, E>` discriminated union mirroring frontend `RepositoryResult<T>` so mapper logic has a 1:1 mapping surface.

---

## 2. Framework Comparison

| | Fastify | Express | NestJS | Honō | Koa |
|---|---|---|---|---|---|
| **TypeScript** | First-class | Weak | First-class | First-class | Weak-ish |
| **Runtime perf** | Fast | Moderate | Slower (DI overhead) | Very fast | Moderate |
| **Schema validation** | Built-in (JSON Schema) | none | class-validator | manual / zod | none |
| **Error handling** | Plugin-first | Middleware spaghe | Guards + filters | manual | middleware |
| **Decorators/DI** | Clean composition | manual | Heavy (Nest DI) | manual | manual |
| **Learning curve** | Low | Low | High | Low | Low |
| **Ecosystem** | Large | Largest | Large | Growing | Small |
| **Fits existing host (PM2, node, CJS/ESM)** | Excellent | Excellent | Good | Good | Good |

**Winner:** **Fastify.** Reason — it is the only one with *safety-by-default validation, low overhead, strong TS*, and *pluggable error/logging* that lets the backend mirror the frontend's contract exactly. Express is too permissive (easy to leak `message` formats); Nest is overkill for one service; Honō is nice but smaller ecosystem. Fastify's `basePath`/`prefix` cleanly maps `version`.

---

## 3. Framework Recommendation (final)

**Fastify v4/5** running on **Node 24 (LTS)**.

- Decorators for `logger` and `config` so routes are `framework-light` and testable with `fastify.inject()` (no network needed for contract tests).
- `await app.register(AppOptions)` composition mirrors the layered tree; hot-swappable in PM2.

---

## 4. Database Recommendation

| | PostgreSQL 16 | MySQL/MariaDB | SQLite | MongoDB |
|---|---|---|---|---|
| **On host?** | ✅ already running | not installed | yes but poor case | not installed |
| **L10n+JSON fields** | `jsonb` perfect | JSON but weaker | no json agg | native JSON |
| **Relationships (albums↔photos↔media)** | FK + joins | FK | weak | denorm |
| **Transactions** | ✅ | ✅ | partial | eventual |
| **Full-text search** | tsvector | basic MATCH | FTS5 | text index |
| **Rollback/ops** | `pg_dump` | limited | file is it | copy |
| **Type safety w/ Prisma** | Excellent | Good | Good | weaker |

**Recommendation:** **PostgreSQL 16** — it is *already running on this host*, already carries the Pterodactyl `panel` DB, supports the L10n JSON columns and FK graph the domain needs, and gives free tsvector search. Zero new infra.

---

## 5. ORM Recommendation

| equivalent | Prisma | Drizzle ORM | TypeORM | Knex + raw |
|---|---|---|---|---|
| **Match frontend types** | strong migration+types | strong SQL-first | moderate | manual |
| **Migrations** | ✅ Prisma Migrate | 🔶 | ✅ | manual |
| **L10n + json enum** | `Json` + enums | good | okay | manua |
| **Trigger/advanced sql** | via `$queryRaw` | full SQL | via raw | full |
| **TS strictness** | verbose | full-control | classes | manual |

**Recommendation:** **Prisma ORM.** Rationale (aligned with the FU token-restyled project):
- **Best-enum-aware schema for the catalog** (`role`, `visibility`, `season`, `status` → Prisma enums).
- Built-in **migrations + seed** to scaffold the current mock data deterministically.
- Directly models the L10n columns (`Json` type) the frontend DTOs require.
- Server/edge agnostic default.

---

## 6. Folder Structure (backend, `apps/api` in a monorepo column appended under `fuurin-album/`)

```
apps/
  api/                          # Fastify backend
    prisma/
      schema.prisma             # models, enums, relations
      migrations/               # Prisma migrate
      seed.ts                   # deterministic seed from /root/fuurin-album/src/lib/data
    src/
      config/                   # env parsing (zod), fail-fast
      server.ts                 # buildApp() — the single export for tests + PM2
      plugins/                  # logger, error, auth-guard, request-id
      domains/                    # per-domain (album, media, user, upload, auth)
        album/
          routes.ts
          service.ts
          repository.ts
          schemas.ts            # zod schemas + TS types (mirror /src/types/repository-dtos)
        media/...
        user/...
        upload/...
        auth/...
      shared/
        result.ts               # {ok,data} | {ok,false,error} — parity with frontend
        paging.ts               # page/limit/sort/filter/q/fields parsing
        errors.ts               # ApiError with status + code
        logger.ts
      types/index.ts            # shared app types
      __tests__/                # vitest + fastify.inject()
    tests/env.spec.ts  /  health.spec.ts / contract.spec.ts
    package.json
    tsconfig.json
```

The backend adds a separate NPM workspace; frontend untouched.

---

## 7. Domain Model

Derived 1:1 from `src/types/repository-dtos.ts` + `src/types/album-editor.ts` + `src/types/media.ts`.

```prisma
enum Role { admin editor viewer }
enum Visibility { draft published }
enum Season { spring summer autumn winter }
enum UploadStatus { queued uploading completed failed cancelled }
enum AlbumCategory { festival school trip culture food travel personal }

model User {
  id        String  @id @default(cuid())
  email     String  @unique
  name      Json    // {ja,id,en}? name is person name -> store as String; role text L10n handled in Member
  role      Role
  avatar    String
  passwordHash String?
  sessions  LoginSession[]
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

model Member {
  id      String  @id @default(cuid())
  nameJa  String
  name    Json    // {ja,id,en}
  role    Json    // {ja,id,en}  (Free-form role label)
  avatar  String
}

model Album {
  slug     String   @id
  title    Json     // {ja,id,en}
  period   Json
  count    Int
  views    Int
  cover    String   // media id / url
  date     String   // YYYY-MM-DD
  season   Season
  category String   // category
  visibility Visibility @default(published)
  publishedAt DateTime?
  photos   Photo[]
  drafts   AlbumDraft[]
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

model Photo {
  id          String  @id @default(cuid())
  albumSlug   String
  album       Album   @relation(fields:[albumSlug], references:[id])
  idx         Int
  src         String
  caption     Json
  ago         Json
  tags        String[]
  likes       Int      @default(0)
  orientation Season  // plain mapping ok
  date        String
  @@unique([albumSlug, idx])
}

// Media view = Photo rows flattened + stable id `${albumSlug}:${idx}`
// (computed via shared mediaId() — no extra table required), but we add
// a Media table for uploads/owned media independent of seed photos.

model Media {
  id        String @id @default(cuid())  // photo store id
  albumSlug String
  idx       Int
  src       String
  caption   Json
  ago       Json
  tags      String[]
  likes     Int @default(0)
  orientation String
  date      String
  @@unique([albumSlug, idx])
}

model TimelineEntry {
  id          String @id @default(cuid())
  date        String
  title       Json
  description Json
  tag         String
  photo       String
}

model AlbumDraft {
  slug         String  @id
  title        String
  description  String
  date         String
  location     String
  visibility   Visibility @default(draft)
  coverMediaId String?
  photoIds     String[]
  updatedAt    Int        // ms epoch — matches AlbumDraft.updatedAt
  albumId      String?    // coalesce on publish
  album        Album?     @relation(...)
}

model Session {
  id        String  @id @default(cuid())
  userId    String
  user      User    @relation(fields:[userId], references:[id], onDelete: Cascade)
  tokenHash String  // hashed JTI
  expiresAt DateTime
  createdAt DateTime @default(now())
}

model UploadRecord {
  id          String @id @default(cuid())
  fileName    String
  sizeBytes   Int
  mimeType    String
  status      UploadStatus @default(queued)
  progress    Int    @default(0)
  createdAt   DateTime
  completedAt DateTime?
  errorMessage String?
}
```

**Design notes**
- `Json` (Postgres jsonb) mirrors frontend `string | L10nDto` so no mapping loss on read.
- `photoIds` and `tags` are `String[]` (postgres array) — matches DTO exactly.
- Login/refresh uses `Session` + `tokenHash` (see Auth).
- `AlbumDraft.referenced` `Album` on publish to denormalize draft→published.

---

## 8. API Convention

**RESTful, plural nouns, resource sub-resources, REST method semantics.**

- Base: `https://fuurin-backend.<host>/v1` (env).
- Endpoints (Sprint 17–20 target):
  - `GET /albums` → `{items:[], total, page, size}` or bare list? — frontend `listAlbums()` maps via DTO; returns array. **Backend returns array** for bare lists, `PageResult` for explored lists.
  - Querying uses the canonical envelope → parse → SQL filters/sorts.
  - Naming: kebab-case path params (`:slug`, `:id`, `:idx`), lowercase verbs in resource paths.
- **Content-Type:** always `application/json` (+ `Accept: application/json`).
- **Pagination conventions:** `page` (0-based), `size` (`limit` query), return `{items,total,page,size}`.
- **Idempotency:** POST /uploads & POST /albums/drafts must echo back created entity; 409 on slug collision.
- **Error envelope:** every non-2xx is `{ "message": "…", "code": "<errorCode>", "details?": … }` (frontend reads `message`).

---

## 9. Validation Strategy

- **Zod schemas per route** (`domains/*/schemas.ts`) — mirror `repository-dtos.ts`, so a change in the frontend DTO ripples to one zod schema.
- **Coercion-in-at the boundary:** `page`, `limit`, `idx` coerced & clamped; arrays (filter, `q`) trimmed.
- Query vs body vs path split predefined; Fastify `schema` + zod plugin (`@fastify/sensible`+ `zod-to-schema`) or manual in service.
- **Outcome:** `validation` errors return **400/422** with `message` + `details[]`; frontend `STATUS_TO_CODE` maps… `400/422→validation`.

---

## 10. Error Strategy

Single `ApiError` class:

```ts
class ApiError extends Error {
  status: 400|401|403|404|409|422|429|500
  code: 'validation'|'unauthorized'|'forbidden'|'not_found'|'conflict'|'transport'|'unknown'
  details?: unknown
}
```

**Global error plugin** maps unknown → 500 / `transport`, known → exact code. Produces `{message, code, details?}`. Logs with `requestId` at `warn`/`error` level.

**Mapping contract (parity with frontend `error-mapper.ts`):**
| Domain code | HTTP |
|---|---|
| `validation` | 400 / 422 |
| `unauthorized` | 401 |
| `forbidden` | 403 |
| `not_found` | 404 |
| `conflict` | 409 |
| `transport` (backend internal) | 500 |

---

## 11. Auth Design

**JWT access + rotating refresh (opaque in DB) — mirrored to frontend `Session`/`token`.**

- `POST /v1/auth/login` — body `{email,password}`, returns `{accessToken, refreshToken, user}` → frontend maps to `Session{user, issuedAt, expiresAt, token}`.
- `POST /v1/auth/refresh` — accepts refresh token, returns new pair; rotates refresh (revoke old `Session` row).
- `POST /v1/auth/logout` — deletes `Session` row.
- `GET /v1/users/me` — from bearer, returns `UserDto`; used by `currentUser()`.
- `Authorization: Bearer <access>` → guard verifies JWT (HS256/RS256) + checks `Session.tokenHash`.
- Access TTL ~15 min; refresh 30 days; rotation bound.
- Roles from `User.role`; permissions derived server-side mirroring `src/lib/auth/permissions.ts` (admin=all, editor=all-except-delete-media, viewer=read-only). **Do not trust frontend role** — recompute from DB.
- `SessionAccessor` on the frontend already attaches `session.token` as bearer; swap mock auth provider for real HTTP login in Sprint 20.

---

## 13. Logging Strategy

- **Fastify built-in Pino**, opts: `level=(NODE_ENV==='prod'?'info':'debug')`, `redact: ['req.headers.authorization']`.
- Every request logs `reqId, method, url, status, durationMs`; errors log stack `error`.
- Console transport in dev; PM2 file logs (PM2 already managed on host); **Sentry/OTel** behind the same logger interface (mirrors frontend `MonitoringAdapter`). 
- Include the `X-Request-Id` the client sends; generate a fallback when missing.
- Redacted keys mirror frontend (`authorization|token|password|secret|cookie|session`).

---

## 14. Testing Strategy

- **Vitest + fastify `.inject()`** (no network) for every route/service.
- **Contract tests** (`__tests__/contract.spec.ts`) — replay the exact query envelopes from `toQueryParams` and assertResponse body shapes from `repository-dtos`. These are the single most important backend tests: they prove byte-parity with the frontend.
- **Prisma tests** — repository unit + integration against a throwaway PostgreSQL DB (host already can).
- **Fail-fast config test** (mirrors `validate-env.mjs`) — invalid env aborts startup.
- Coverage target ≥80% on `routers`+`validation`+`errors`.

---

## 15. Deployment Strategy

- **PM2 (already the pattern):** `pm2 start ecosystem.config.js --only fuurin-api`. `exec_mode: fork`, port `4001`. PM2 is in the pipeline on this host — ingest `ffc` and `nginx` nothing new.
- **Caddy reverse proxy** at `:80/443` already fronts the box: add subordination `api.fuurin.reiyuura.pw` → `127.0.0.1:4001` (matches existing Caddy cert auto).
- **DB:** new `fuurin` database on the same local PostgreSQL 16 (create user role + DB; Oly; no new infra).
- **Env:** `.env` with `DATABASE_URL`, `JWT_SECRET`, `PORT`, plus mirror of the frontend `API_*` keys.
- **Deploy flow:** `git pull && npm ci && prisma migrate deploy && npm run build && pm2 restart fuwar-api`.
- **Health:** `/v1/healthz` (no auth) returns `{status, version, uptime, env}` — mirrors `/api/health`.
- **Rollback:** keep previous image+`prisma migrate` plan; `pg_dump` backup before data migrations.

---

## 16. Risks & Tradeoffs

| Risk | Impact | Mitigation |
|---|---|---|
| **Frontend retry (GET only, 2x)** dusting on 5xx/429 | Server must be idempotent ro | Use `GET` only for idempotent reads & drafts NEVER duplicate sidebar writes; no client-side POST retry (confirmed `.retry-policy` — POST not retried) |
| **Prisma `Json` vs `String[]`** | migration drift from DTO | index seed & snapshot straight from `src/lib/data` at migration; map unit contract tests |
| **DB relation album↔photo** | cascade deletes | Prisma `onDelete` on nullable edges; route guards|
| **Bearer vs cookie** | token leak in chrome devtools | short TTL + `HttpOnly`,`SameSite` refresh; never log token (logger redact) |
| **Host shared Postgres with `panel`** | accidental cross-DB | separate DB + per app user; never give app `superuser` |
| **Fastify/LTS changes** | lock `package-lock`, pin Node 24 via `.nvmrc`+CI | CI on Node 24 |
| **Frontend expects bare arrays** for some list endpoints | mismatch on list wrapping | keep public list endpoints returning **bare arrays**; paginated only where `PageResult` required in DTOs |

---

## 17. Sprint Breakdown

### Sprint 17 — Scaffold + Health + Fail-fast
1. Monorepo workspace `apps/api` init; `@misc/typescript-config`.
2. Fastify `buildApp()`, plugins (pino logger, cors, error).
3. Config parsing w/ Zod + fail-fast on invalid env (mirror `validate-env.mjs`).
4. `GET /v1/healthz` + test.
5. `.env.example`, PM2 flow, Caddy vhost (deploy `api.fuurin.reiyuura.pw`).
6. Contract test harness (use frontend `toQueryParams` known-good output).

### Sprint 18 — Domain + Read API
1. Prisma schema (`User`,`Album`,`Photo`,`MediaItem`,`TimelineEntry`,`Member`) + seed from `data.ts` + `prisma migrate deploy`.
2. Repos (read paths) for album/photo/media/timeline/members.
3. Parser for query envelope (page/sort/filter/q/fields).
4. Read routes: albums, albums/:slug, albums/:slug/photos, albums/:/:idx/photos/:idx, albums/summaries, media, members, timeline.
5. Contract tests per read route; integration DB tests.

### Sprint 19 — Write/Draft API + Validation
1. `AlbumDraft` CRUD routes (POST/GET/PATCH/DELETE `/albums/drafts[*]`), slug uniqueness → 409.
2. `publish` service (draft→Album, coalesce photoIds, set publishedAt).
3. Zod schemas for all bodies; 422 on bad input.
4. `users/me` GET/PATCH.
5. tests.

### Sprint 20 — Upload + Auth
1. JWT login/refresh/logout + `Session` model + bearer guard + hashing.
2. Swap frontend auth provider to real login (Session token flow) — *smallest frontend touch, isolated.*
3. Upload repository: POST /uploads (metadata), list, delete, clear; response mirrors `UploadDto`.
4. Storage service: local disk (host) in Sprint 20; object-store (S3-compatible) behind an interface in later sprint.
5. Upload worker integration (`use-upload-worker` talks to real `/uploads`).
6. Full end-to-end contract/smoke.

**Deferred (not Sprint 16):** frontend route wiring; CSS; any UI change.

---

## Deliverables Checklist (this plan)

- ✅ Architecture Diagram
- ✅ Folder Tree
- ✅ Framework Comparison
- ✅ Database Comparison
- ✅ ORM Comparison
- ✅ Domain Model
- ✅ API Convention
- ✅ Error Model
- ✅ Validation
- ✅ Storage Strategy
- ✅ Auth Strategy
- ✅ Deployment Strategy
- ✅ Roadmap Sprint 16–20 (17 = scaffold, 18 = read, 19 = write, 20 = upload+auth)

**Decision points requiring your approval:**
1. **Fastify** as the framework? (vs Express/Nest).
2. **PostgreSQL 16 + Prisma** (reusing on-host Postgres, shared).
3. **Monorepo** `apps/api` inside the existing `fuurin-album` repo.
4. Bare-array list contracts + `PageResult` only where required (parity-preserving).
5. Sprint-20 uploads to local disk now, object-store abstraction later.

---

_Saved by Hermes Agent for Milestone D — Sprint 16. Awaiting approval._