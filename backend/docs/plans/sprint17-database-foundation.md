# Sprint 17 — Database Foundation: Implementation Plan

> **Status:** DRAFT — awaiting approval. **No code written yet.** **No migration. No schema changes. No coding.**
> **Scope:** Data foundation only — Prisma models, migrations, seed, repository implementations, query/transaction strategy. No CRUD endpoints, no auth, no upload yet.
>
> **For Hermes:** after approval, implement task-by-task below using subagent-driven-development.

## Header

- **Goal:** Build the **data foundation** the Sprint 18 read APIs and Sprint 19+ write APIs will sit on. Backend must satisfy the Sprint 16 repository contracts exactly (method-for-method, error codes, query envelope).
- **Architecture:** Service → Repository Interface (Sprint 16) → PrismaAlbumRepository (Sprint 17) → Prisma Client → PostgreSQL 16. **Services never see Prisma.** The Prisma client is constructed once at startup and injected into repository implementations.
- **Tech stack:** Prisma 6 (already pinned), PostgreSQL 16 (already running on host), TypeScript 5, Vitest.
- **Lock invariants:** No change to `Result<T>`, `ApiError`, `STATUS_TO_CODE`, `StorageProvider`, `QueryOptions`, `parseQueryParams`, frontend DTOs, frontend `ApiClient`, frontend `Repository` interfaces.

---

### 1.1. Refinements (approved, applied)

**Refinement 1 — Album.slug stays as Primary Key.**
- **Decision:** Slug remains the PK.
- **Justification:**
  - Frontend URL contract `/albums/[slug]` and `mediaId(slug, idx)` already treat slug as identity; introducing a UUID would require an extra `id → slug` lookup on every navigation.
  - The frontend `AlbumRepository.getAlbum(slug)` takes slug directly; no UUID is ever surfaced.
  - Slug is contractually immutable after creation (`Album.slug` is the stable PK in `AlbumDraft` too). There is no rename use case.
  - Joins become single-column reads (`Photo.albumSlug → Album.slug`); no intermediary `id` to thread.
  - All DTOs and the mock `MockApiClient` routes use slug as identity.
- **Long-term consequence:** if a future requirement demands slug renames (e.g. localization of slug), the migration to a UUID PK is feasible: add `id UUID PK`, backfill from slug, change FKs. Slugs remain UNIQUE. This is a 1-2 sprint effort when/if needed; it does **not** affect the frontend contract.

**Refinement 2 — TimelineEntry uses a nullable FK to Album.**
- **Decision:** Add nullable `albumId` FK + nullable `categoryTag` free-form. The mapper computes the wire `tag = albumId ?? categoryTag ?? 'kelas'` (matching `mock-api-client.ts: t.album ?? 'kelas'`).
- **Justification:** Referential integrity is preserved — a timeline entry cannot reference a non-existent album — while still allowing category-style entries (`'kelas'`) that don't point at any album. `ON DELETE SET NULL` means deleting an album keeps the timeline history with `categoryTag` taking over.

**Refinement 3 — `AlbumDraft.updatedAt` becomes `DateTime`, converted in mapper.**
- **Decision:** `DateTime` column with Prisma `@updatedAt`. The mapper returns `number` (ms epoch) to satisfy the frontend `AlbumDraft.updatedAt: number` contract.
- **Justification:** Native Postgres `DateTime` is indexable, sortable, human-readable in DB inspection, and supports `@updatedAt` auto-update. Service code can do `Date.now() - draft.updatedAt.getTime()` directly. The mapper conversion is one line: `Number(updatedAt.getTime())`. Frontend contract unchanged.

**Refinement 4 — Photo and Media collapse into one `Photo` table.**
- **Decision:** Drop the `Media` table entirely. `MediaRepository` reads `Photo` directly; the mapper synthesizes `MediaItem.id = mediaId(albumSlug, idx)` from `(albumSlug, idx)`.
- **Justification:** `Media` and `Photo` are 1:1 by design (the frontend `mock-api-client.ts` seeds `MediaDto` by mapping over `PhotoDto` with the same shape). Two tables with `UNIQUE(albumSlug, idx)` on both creates:
  - Storage duplication (every photo row written twice).
  - A "keep in sync" invariant the test suite would have to enforce forever.
  - A risk surface for drift if anyone ever inserts to one but not the other.
- No different lifecycle, no different access pattern at the DB layer (`listPhotos(slug)` is `WHERE albumSlug = slug`; `media.list()` is just no-album-filter; `media.search(q)` is `ILIKE` on the same fields).
- Future "orphan uploads not yet attached to any album" can live in `UploadRecord` (which already exists) — that IS its lifecycle; Sprint 20's upload pipeline writes there.

**Refinement 5 — `deletedAt: DateTime?` columns on Album / Photo / TimelineEntry / Member / AlbumDraft (schema only, no logic in Sprint 17).**
- **Decision:** Add nullable `deletedAt` columns. Sprint 17 does **not** implement delete semantics; repositories continue to behave as hard-delete.
- **Future design (Sprint 19+):**
  - Repository methods that mutate gain a `softDelete(slug)` and `restore(slug)` pair.
  - All default `list/get` methods add `where: { deletedAt: null }` to their Prisma filters.
  - A `withDeleted?: boolean` flag on `QueryOptions` opts into trash views.
  - The unique constraint `Photo[albumSlug, idx]` is NOT enforced for soft-deleted rows — use a partial unique index: `CREATE UNIQUE INDEX … WHERE deleted_at IS NULL`.
- **Why now:** adding the column later requires a migration with default backfill + index rebuild. Adding it now is essentially free; the design is locked but no behavior change ships.



| Source | What it locks |
|---|---|
| `backend/src/repositories/{album,media,user,upload}-repository.ts` | method signatures — implemented method-for-method |
| `backend/src/shared/result.ts` | `Result<T> = {ok:true,value:T} \| {ok:false,error:{code,message,cause?}}` |
| `backend/src/shared/errors.ts` | `ApiError` + `STATUS_TO_CODE` — never throw plain errors from repos |
| `backend/src/shared/paging.ts` | `parseQueryParams(URLSearchParams) → QueryOptions` |
| `backend/src/domain/models.ts` | Domain shapes returned by every repository method |
| `src/types/repository-dtos.ts` | Frontend DTOs — wire-format compat |
| `src/lib/repositories/*-repository.ts` | Frontend repository interface (method-for-method parity) |

**Read-side returns bare arrays for simple lists** (parity with `MockApiClient` in `src/lib/repositories/mock-api-client.ts`):
- `listSummaries`, `listPhotos`, `listTimelineEntries`, `existingSlugs`, `listMembers`, `list` (media), `list` (uploads), `search` (media) — bare `Result<T[]>`.
- `listAlbums` is the only one with pagination → `Result<PageResult<Album>>`.

---

## 1. Prisma Architecture

```
                            ┌──────────────────────────┐
                            │   Service (Sprint 18+)   │
                            │   depends on interface   │
                            └────────────┬─────────────┘
                                         │
                            ┌────────────▼─────────────┐
                            │  Repository Interface    │ ← Sprint 16 (frozen)
                            │  (album|media|user|upload│
                            │   -repository.ts)        │
                            └────────────┬─────────────┘
                                         │ implements
                            ┌────────────▼─────────────┐
                            │  PrismaXxxRepository     │ ← Sprint 17 (this sprint)
                            │  PrismaAlbumRepository   │
                            │  PrismaMediaRepository   │
                            │  PrismaUserRepository    │
                            │  PrismaUploadRepository  │
                            └────────────┬─────────────┘
                                         │ depends on
                            ┌────────────▼─────────────┐
                            │  PrismaClient singleton  │ ← Sprint 16 (frozen)
                            │  (from src/database/...) │
                            └────────────┬─────────────┘
                                         │ SQL over
                                       PostgreSQL 16
```

Three rules:
1. **Repositories never throw.** Every Prisma call is wrapped; `Prisma.PrismaClientKnownRequestError` is mapped to `RepositoryError` via `STATUS_TO_CODE`-aligned mapping (`P2002 → conflict`, `P2025 → not_found`, etc.).
2. **Repositories never return a Prisma model.** They always map to `domain/models.ts` via the dedicated `mappers/prisma-to-domain.ts`. Services see only domain types.
3. **No raw SQL outside the repository layer.** `$queryRaw` is permitted only inside repositories (for `tsvector` search — Sprint 20+), never in services.

---

## 2. Entity Diagram

```text
            ┌──────────────────────────────────────────────────────────────┐
            │                          User                                │
            │  id (cuid, PK) · email (UNIQUE) · name · role(enum) · avatar  │
            │  passwordHash? · createdAt · updatedAt                       │
            └───────────────┬───────────────────────┬──────────────────────┘
                            │ 1                     │ 1
                            │ author/owner          │ login sessions
                            │ *                     │ *
            ┌───────────────▼─────────────────┐  ┌──▼──────────────────────────┐
            │             Album               │  │         Session             │
            │  slug (PK) · title(jsonb)       │  │  id (PK) · userId(FK)       │
            │  period(jsonb) · count · views  │  │  tokenHash · expiresAt      │
            │  cover · date · season(enum)    │  │  createdAt                  │
            │  category · visibility(enum)    │  └─────────────────────────────┘
            │  ownerId(FK) · publishedAt?
            │  deletedAt? · createdAt · updatedAt
            └───┬──────────────────┬────────────────────┬────────────────────┘
                │ 1                │ 1                  │ 1
                │ owns 0..N        │ owns 0..N          │ may have 0..N
                │                  │                    │
       ┌────────▼────────┐ ┌──────▼────────┐  ┌─────────▼────────────┐
       │     Photo       │ │  AlbumDraft   │  │   TimelineEntry      │
       │ id (cuid, PK)   │ │ slug (PK)     │  │ id (PK)              │
       │ albumSlug (FK)  │ │ title · desc  │  │ date · title(jsonb)  │
       │ idx · src       │ │ date · loc    │  │ description(jsonb)   │
       │ caption(jsonb)  │ │ visibility    │  │ albumId?(FK nullable)│
       │ ago(jsonb)      │ │ coverMediaId? │  │ categoryTag?         │
       │ tags(string[])  │ │ photoIds(str[])│ │ photo                │
       │ likes · orient  │ │ updatedAt(DT) │  │ deletedAt?           │
       │ date · deletedAt│ │ albumId?(FK)  │  │                      │
       │   UNIQUE        │ │ deletedAt?    │  │ wire: tag = album.slug│
       │   (album,idx)   │ └───────────────┘  │   ?? categoryTag     │
       └─────────────────┘                    │   ?? 'kelas'         │
                                              └──────────────────────┘

  ┌─────────────────────┐  ┌─────────────────────┐
  │      Member         │  │   UploadRecord      │
  │  id (PK) · name(jsonb) │ id (PK)           │
  │  nameJa · role(jsonb) │ fileName · sizeBytes│
  │  avatar · deletedAt? │ mimeType · status   │
  └─────────────────────┘ │ progress · createdAt│
                          │ completedAt? · err? │
                          └─────────────────────┘
```

`Photo` is the **single canonical table** for both the per-album photo collection (`listPhotos(slug)`) and the lib-wide media view (`MediaRepository`). `UNIQUE(albumSlug, idx)` is the join key. `MediaRepository.list()` reads `Photo` and the mapper synthesizes `id = mediaId(albumSlug, idx)` from `(albumSlug, idx)`.

---

## 3. Relation Diagram

```text
User  1 ──── *  Album              (ownerId)         ON DELETE: RESTRICT
User  1 ──── *  Session            (userId)          ON DELETE: CASCADE
Album 1 ──── *  Photo              (albumSlug)       ON DELETE: CASCADE
Album 1 ──── 0..1 AlbumDraft       (albumId)         ON DELETE: SET NULL
Album 1 ──── *  TimelineEntry      (albumId, null)   ON DELETE: SET NULL

UploadRecord   ···  User            no FK in Sprint 17 — auth-bound ownership
                                    lands in Sprint 20 (auth) and may add FK
```

`TimelineEntry.albumId` is **nullable**: `NULL` means the entry is a category-style entry (`'kelas'`, etc.) and `categoryTag` holds the free-form label. The wire-format `tag` is computed by the mapper as `album.slug ?? categoryTag ?? 'kelas'`.

---

## 4. Schema Design (Prisma)

### 4.1 Enums (mirror the frontend literal unions 1:1)

```prisma
enum UserRole        { admin editor viewer }
enum AlbumVisibility { draft published }
enum Season          { spring summer autumn winter }
enum AlbumCategory   { school festival study travel graduation }   // = src/lib/data.ts AlbumCategory
enum MediaOrientation{ landscape portrait }
enum UploadStatus    { queued uploading completed failed cancelled }
```

> **Why enums (not text):** the frontend imports `type AlbumCategory = 'school'|'festival'|…` as a TS union. Mirror in DB as a Prisma enum → invalid values cannot enter the database. If the frontend union grows later, both sides must move together.

### 4.2 Models — full Sprint 17 schema (final spec — DO NOT IMPLEMENT UNTIL APPROVED)

```prisma
// ── Users & Sessions ─────────────────────────────────────────────────
model User {
  id           String   @id @default(cuid())
  email        String   @unique
  name         String
  role         UserRole
  avatar       String
  passwordHash String?
  albums       Album[]  @relation("UserAlbums")
  sessions     Session[]
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
}

model Session {
  id        String   @id @default(cuid())
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  tokenHash String   @unique
  expiresAt DateTime
  createdAt DateTime @default(now())
}

// ── Albums ───────────────────────────────────────────────────────────
model Album {
  slug        String   @id
  title       Json
  period      Json
  count       Int      @default(0)
  views       Int      @default(0)
  cover       String
  date        String   // YYYY-MM-DD
  season      Season
  category    AlbumCategory
  visibility  AlbumVisibility @default(published)
  ownerId     String
  owner       User     @relation("UserAlbums", fields: [ownerId], references: [id], onDelete: Restrict)
  publishedAt DateTime?
  photos      Photo[]
  drafts      AlbumDraft[] @relation("AlbumDraftAlbum")
  timelineEntries TimelineEntry[]
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  deletedAt   DateTime?        // soft-delete; Sprint 19+ opts in
}

// ── Photos (canonical album-indexed; also serves the media library) ──
model Photo {
  id          String           @id @default(cuid())
  albumSlug   String
  album       Album            @relation(fields: [albumSlug], references: [slug], onDelete: Cascade)
  idx         Int
  src         String
  caption     Json
  ago         Json
  tags        String[]
  likes       Int              @default(0)
  orientation MediaOrientation
  date        String
  createdAt   DateTime         @default(now())
  deletedAt   DateTime?        // soft-delete; Sprint 19+ opts in

  @@unique([albumSlug, idx])
  @@index([albumSlug, idx])
  @@index([date])
  @@index([albumSlug, date])
}

// ── Album drafts (editor) ────────────────────────────────────────────
model AlbumDraft {
  slug         String   @id
  title        String
  description  String
  date         String
  location     String
  visibility   AlbumVisibility @default(draft)
  coverMediaId String?
  photoIds     String[]
  updatedAt    DateTime         @updatedAt            // mapper converts to number (ms epoch)
  albumId      String?
  album        Album?    @relation("AlbumDraftAlbum", fields: [albumId], references: [slug], onDelete: SetNull)
  createdAt    DateTime  @default(now())
  deletedAt    DateTime?        // soft-delete; Sprint 19+ opts in

  @@index([updatedAt])
}

// ── Members (people shown in the gallery) ────────────────────────────
model Member {
  id       String   @id @default(cuid())
  nameJa   String
  name     Json
  role     Json
  avatar   String
  deletedAt DateTime?

  @@index([nameJa])
}

// ── Timeline ─────────────────────────────────────────────────────────
model TimelineEntry {
  id          String   @id @default(cuid())
  date        String
  title       Json
  description Json
  // Either an FK to an Album (preferred when the entry is album-scoped)
  // or a free-form categoryTag (e.g. 'kelas'). The mapper exposes a
  // single `tag` field for the wire, falling back to `categoryTag ?? 'kelas'`.
  albumId     String?
  album       Album?   @relation(fields: [albumId], references: [slug], onDelete: SetNull)
  categoryTag String?
  photo       String
  deletedAt   DateTime?

  @@index([date])
  @@index([albumId])
}

// ── Upload records ───────────────────────────────────────────────────
model UploadRecord {
  id            String       @id @default(cuid())
  fileName      String
  sizeBytes     Int
  mimeType      String
  status        UploadStatus @default(queued)
  progress      Int          @default(0)
  createdAt     DateTime     @default(now())
  completedAt   DateTime?
  errorMessage  String?

  @@index([createdAt])            // upload history list, newest first
  @@index([status])               // filter active vs failed uploads
}
```

### 4.3 Datatype choices

| Field | Type | Reason |
|---|---|---|
| `title`, `period`, `caption`, `ago`, `name`, `role` (Member), `description` (Timeline), `title` (Timeline) | `Json` | L10n `{ja,id,en}` exactly mirrors frontend `L10nDto`; round-trip through `JSON.parse/stringify` keeps shape stable. |
| `tags` (Photo/Media), `photoIds` (AlbumDraft) | `String[]` | Direct array support; matches DTO `string[]` field; PostgreSQL native array. |
| `date` (Album/Photo/Media/TimelineEntry) | `String` | `YYYY-MM-DD` literals — the entire app uses ISO strings. No `Date` round-trip. |
| `updatedAt` (AlbumDraft) | `BigInt` | Mirrors the frontend `AlbumDraft.updatedAt: number` (ms epoch). |
| `orientation` (Photo/Media) | enum | Two-value domain — type-safety over freeform. |

---

## 5. Constraint Strategy

| Constraint | Where | Why |
|---|---|---|
| **PK `cuid()` (User, Photo, Media, AlbumDraft (proxy by slug), TimelineEntry, Member, UploadRecord)** | All except `Album`, `AlbumDraft` | Distributed-safe, sortable, opaque. `Album.slug` is the natural PK (already unique in DTO and frontend contract). |
| **PK = natural key (Album.slug, AlbumDraft.slug)** | Album, AlbumDraft | The frontend URL `/albums/[slug]` treats slug as identity. PK on slug enforces uniqueness at the storage layer. |
| **Unique `[albumSlug, idx]`** | Photo, Media | `mediaId(slug, idx)` is the canonical id (`src/types/media.ts mediaId()`). DB uniqueness guarantees no two rows ever share the same frontend-visible identity, even with concurrent imports. |
| **Unique `email`** | User | Auth uniqueness; index enables `WHERE email = ?` lookups. |
| **Unique `tokenHash`** | Session | Lets the API server look up sessions by hashed JWT id (auth arrives Sprint 20). |
| **FK `Album.ownerId → User.id ON DELETE RESTRICT`** | Album | Cannot delete a user who owns an album without first reassigning ownership. Prevents data loss from a single typo. |
| **FK `Session.userId → User.id ON DELETE CASCADE`** | Session | A user's sessions are wiped when their account is deleted — clean logout. |
| **FK `Photo/Media.albumSlug → Album.slug ON DELETE CASCADE`** | Photo, Media | Removing an album cleans up its photo rows. |
| **FK `AlbumDraft.albumId → Album.slug ON DELETE SET NULL`** | AlbumDraft | A draft may outlive its album (editor keeps working while an admin deletes the published record). The draft remains readable; `publish` then re-creates the album. |
| **NOT NULL on every field except nullable ones** | everywhere | Repository mappers can rely on shape consistency. |
| **Default values** | `count=0`, `views=0`, `visibility=published`, `status=queued`, `progress=0`, `createdAt=now()`, `updatedAt=@updatedAt` | Lets inserts avoid passing computed fields. |
| **No DB-level CHECK on `caption.ja`** | Photo, Media | The frontend DTOs permit `string \| L10nDto` (a plain string is allowed). A CHECK would lock us to object form only. Mappers normalize. |

---

## 6. Index Strategy

| Index | Table | Tradeoff |
|---|---|---|
| `@@index([albumSlug, idx])` | Photo, Media | Composite keeps the `UNIQUE` constraint lookup fast AND accelerates `WHERE albumSlug = ?` list scans. Same as the unique index — only one B-tree. |
| `@@index([date])` | Media, TimelineEntry | Powers "newest first" (`ORDER BY date DESC`) and `sort=date:desc`. Cost: a small write overhead on insert; gain: index-only scan instead of seq scan. |
| `@@index([albumSlug, date])` | Media | Album-scoped timeline-within-album. Combined with `tags` filtering at the app layer in Sprint 18+. |
| `@@index([updatedAt])` | AlbumDraft | Editor list sorted by "last edited". |
| `@@index([status])` | UploadRecord | "What's still queued?" — small partial-index candidate for Sprint 20 once the table grows. |
| `@@index([createdAt])` | UploadRecord | Default ordering by upload time. |
| `@@index([nameJa])` | Member | Search by kana. |
| (Implicit) `@@unique([email])` | User | Login lookup. |
| (Implicit) `@@unique([albumSlug, idx])` | Photo, Media | Media-id lookup. |
| **No index on `tags` (GIN)** | Photo, Media | Deferred: Postgres GIN on text arrays accelerates `tags && ARRAY[...]` but slows inserts. Add in Sprint 20+ when search traffic justifies it. |
| **No full-text index** | any | Sprint 18 uses app-layer fuzzy match for Sprint 18's `q` param. Sprint 20+ adds `tsvector` on `caption::text` once `media.search` real-load is observed. |

---

## 7. Repository Mapping

### 7.1 Mapper discipline

A new file `backend/src/repositories/mappers/prisma-to-domain.ts` owns **all** Prisma → domain conversion. Repositories call mappers; services never see `Prisma.X` types.

### 7.2 Album mapping

| Prisma `Album` | Domain `Album` |
|---|---|
| `slug` | `slug` |
| `title: Json` | `title: L10n` (parse once) |
| `period: Json` | `period: L10n` |
| `count: number` | `count` |
| `views: number` | `views` |
| `cover: string` | `cover` |
| `date: string` | `date` |
| `season: Season` (enum) | `season` (matches `Album.season`) |
| `category: AlbumCategory` (enum) | `category` (matches `AlbumCategory`) |

### 7.4 AlbumDraft mapping

| Prisma `AlbumDraft` | Domain `AlbumDraft` |
|---|---|
| `slug, title, description, date, location, visibility, coverMediaId, photoIds` | direct |
| `updatedAt: DateTime` | `updatedAt: number` (ms epoch: `updatedAt.getTime()`) |

### 7.5b Photo mapping (also serves MediaRepository)

| Prisma `Photo` | Domain |
|---|---|
| `caption: Json` → `L10n` | `caption: L10n` |
| `ago: Json` → `L10n` | `ago: L10n` |
| `orientation: MediaOrientation` | direct |
| `idx, date` | joined onto `Photo & {idx, date}` |
| For `MediaItem` only: `id` synthesized as `mediaId(albumSlug, idx)` |

### 7.5c TimelineEntry mapping

| Prisma `TimelineEntry` | Domain `TimelineEntry` |
|---|---|
| `date, title, description, photo` | direct |
| `albumId` (nullable) | resolved via `include: { album: true }`; if album present → `tag = album.slug` |
| `categoryTag` (nullable) | fallback when `albumId` is null |
| `tag` (wire) | `album?.slug ?? categoryTag ?? 'kelas'` (mirrors `mock-api-client.ts: t.album ?? 'kelas'`) |

### 7.5d Soft-delete (schema-only in Sprint 17)

Repositories DO NOT add `where: { deletedAt: null }` filters in Sprint 17. The column exists on every entity so Sprint 19+ can add `softDelete`/`restore` and the filter opt-in without a destructive migration.

### 7.5 Result construction

Each repository method wraps its work in `try/catch`:

```text
Prisma.PrismaClientKnownRequestError
  ├─ P2002 (unique violation) → err('conflict', message)
  ├─ P2025 (not found)        → ok(null)  for getX methods, else err('not_found')
  └─ everything else          → err('unknown', message, cause)

Prisma.PrismaClientValidationError → err('validation', message)

Other thrown values → err('unknown', message, cause)
```

### 7.6 What services will see

```text
repo.listSummaries()        → Result<AlbumSummary[]>
repo.listAlbums(opts)       → Result<PageResult<Album>>
repo.getAlbum(slug)         → Result<Album | null>          // ok(null) when not found
repo.listPhotos(slug, opts) → Result<Photo[]>
repo.getPhoto(slug, idx)    → Result<Photo | null>
repo.listTimelineEntries()  → Result<TimelineEntry[]>
repo.existingSlugs()        → Result<string[]>
repo.getDraft(slug)         → Result<AlbumDraft | null>
repo.createDraft(input, vis)→ Result<AlbumDraft>
repo.updateDraft(...)       → Result<AlbumDraft>
repo.deleteDraft(slug)      → Result<void>
repo.publish(slug)          → Result<AlbumDraft>
```

Identical to Sprint 16 contracts. Sprint 18 service code reads `Result<T>` and never imports Prisma.

---

## 8. Transaction Strategy

Prisma's `$transaction` is used when an operation must be atomic across multiple rows. Sprint 17 implementations use it in **exactly three places** — everything else is single-row:

| Operation | Tables touched | Why transaction |
|---|---|---|
| **`createDraft`** when an album already exists for the slug | insert into `AlbumDraft` + flip `Album.visibility` to `draft` if needed | Either both succeed or neither — avoids an album "in draft" with no draft row. |
| **`publish`** | update `AlbumDraft` (visibility=published, updatedAt=now), upsert into `Album` from draft's photos, set `Album.publishedAt=now` | The draft and the published row must reflect the same intent — partial publish would break `/albums/[slug]` reads. |
| **`reorderPhotos`** (Sprint 19+ but laid out here) | update each `Photo.idx` for the affected photos | Two clients reordering concurrently would otherwise produce a non-unique `(albumSlug, idx)`; the transaction serializes by album. |

### 8.1 Isolation

`prisma.$transaction([...], { isolationLevel: 'Serializable' })` for `publish` and `reorderPhotos` — these are the only cases where concurrent updates on the same `albumSlug` could violate uniqueness. Read operations use the default Read Committed.

### 8.2 Retry

Inside `publish` and `reorderPhotos`, retry **once** on `P2034` (write conflict / serialization failure). After the retry, surface as `err('conflict', 'concurrent write', cause)` — never loop silently.

### 8.3 What does **not** use a transaction

- `getAlbum`, `listPhotos`, `listAlbums`, etc. — reads.
- `createDraft` when no album exists yet — single insert.
- `updateDraft` patches — single update.
- `deleteDraft` — single delete (with cascade nulling handled by FK).
- `record(Upload)` — single insert.
- `remove(Upload)` — single delete.

### 8.4 Batch updates

`reorderPhotos` will use a single `updateMany`-then-individual approach:
1. Move all affected rows to a negative `idx` range to free the target range.
2. Set the final positions.
3. This avoids the unique-constraint deadlock that comes from naive in-place updates.

---

## 9. Migration Strategy

### 9.1 Initial migration

`prisma migrate dev --name init` produces `prisma/migrations/<timestamp>_init/migration.sql`. The migration file is committed; **`migrate dev` is never run against production**.

### 9.2 Production deploy

`prisma migrate deploy` — applies pending migrations without prompting. The script `scripts/migrate.sh` (added in Sprint 17) wraps it with:

```bash
#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
npx prisma migrate deploy
```

### 9.3 Pre-migration backup

`pg_dump --schema-only --no-owner -d fuurin > /var/backups/fuurin-schema-pre-${TIMESTAMP}.sql`. A `pre-migrate.sh` script runs this before every `migrate deploy`. (Not committed — local operator step.)

### 9.4 Rollback

- **Sprint 17 only ships the initial migration.** There is no down-migration to roll back.
- For subsequent sprints: write a hand-rolled `down.sql` alongside each forward migration when the change is destructive (`drop column`, `alter type`, etc.). For additive changes the down is implicit (the new column/migration can be ignored).
- If the production deploy of a destructive migration fails mid-way, the operator restores from the pre-migration `pg_dump` snapshot. The CI smoke test (`scripts/verify-production.mjs` already exists in the frontend) is extended in Sprint 17 to also confirm `/api/v1/healthz?check=db` succeeds.

### 9.5 Versioning

- Migration filenames stay Prisma-managed (`<timestamp>_<name>`).
- One environment variable, `DATABASE_MIGRATION_LOCK_TIMEOUT`, controls how long concurrent deploys wait for the migration lock (default 60 s, configurable).

---

## 10. Seed Strategy

`backend/prisma/seed.ts` runs after every `migrate reset` and in fresh CI environments. It is deterministic — **no random sources** — so test outcomes are reproducible.

### 10.1 What gets seeded

| Table | Count | Source |
|---|---|---|
| `User` | 1 | `rei@fuurin.id` (admin) — matches frontend seeded `CURRENT_USER` |
| `Album` | 2 | `hanami-2026`, `tanabata-2026` (or two from `ALBUMS` in `src/lib/data.ts`) |
| `Photo` | 20 | 10 per album, deterministic captions/tags from a static pool — same source the frontend `mock-api-client.ts` uses |
| `TimelineEntry` | 6 | from `TIMELINE` in `src/lib/data.ts` — entries that map to an album use `albumId` FK; category entries (`'kelas'`) use `categoryTag` |
| `Member` | 6 | from `MEMBERS` in `src/lib/data.ts` |
| `AlbumDraft` | 1 | sample draft for the editor — references `hanami-2026` |
| `UploadRecord` | 0 | empty — uploads only created via the API |

> **Why only 2 albums/20 photos:** the brief asks for realistic minimal data, not a mirror of every `ALBUMS` entry. The two-album sample keeps CI fast while exercising FK + index paths.

### 10.2 Idempotency

`upsert` on natural keys (`User.email`, `Album.slug`, `Photo.(albumSlug,idx)`, etc.) — re-running `seed` is safe and converges to the same state.

### 10.3 Script entry

`package.json` adds:

```json
"prisma": { "seed": "tsx prisma/seed.ts" }
```

So `npx prisma db seed` works alongside `migrate`.

---

## 11. Health Check Strategy

### 11.1 Existing endpoint (`GET /api/v1/healthz`)

Keeps the Sprint 16 response (process liveness). No change.

### 11.2 New endpoint (`GET /api/v1/healthz?check=db`)

When `check=db`:

1. Execute `SELECT 1` via `prisma.$queryRaw`.
2. On success: `200` with body `{ status, version, uptime, environment, storage, database: { status: 'ok', latencyMs }, timestamp }`.
3. On failure (timeout, connection refused, auth, etc.): `503` with `database.status = 'down'` and `database.error = '<message>'`; the body still has `status: 'degraded'`. The frontend `error-mapper` maps 503 → `transport`.

A 5-second timeout wraps the probe so a hung Postgres doesn't pin the health check. The check is implemented in `services/health-service.ts` and routed via the existing `/healthz` route — same handler, branched on `request.query.check`.

### 11.3 Why two endpoints vs. one

Sprint 16's `/healthz` is the process probe (cheap, always-on, suitable for k8s liveness). `/healthz?check=db` is the readiness probe — suitable for k8s readiness + external monitoring. Two surfaces, two intent.

---

## 12. Query Strategy (QueryOptions → SQL)

### 12.1 Pagination

| Wire | SQL |
|---|---|
| `page=N, limit=M` (default `limit=20`, max `limit=100`) | `OFFSET N*M LIMIT M` + a separate `SELECT COUNT(*)` for `total` |

**Offset vs cursor:** Sprint 17 uses **offset** because the frontend `toQueryParams` already emits `page` + `limit`. Cursor-based pagination (`?cursor=...`) is a Sprint 20+ optimization if/when the photo library grows past ~5k photos and "load page 200" becomes a real concern.

### 12.2 Sorting

| Wire (`sort=key:dir`) | SQL `ORDER BY` |
|---|---|
| `date:desc` (default for album list) | `ORDER BY date DESC, id ASC` |
| `views:desc` | `ORDER BY views DESC, id ASC` |
| `title:asc` | `ORDER BY title->>'en' ASC, id ASC` (JSONB key for L10n sort) |
| `createdAt:desc` | `ORDER BY created_at DESC` |
| `idx:asc` (photos inside album) | `ORDER BY idx ASC` |
| `updatedAt:desc` (drafts) | `ORDER BY updatedAt DESC` |

A small whitelist in `prisma-sort.ts` maps allowed `key`s → Prisma `orderBy` clauses. **Unknown keys are ignored silently** so the frontend can probe new sort axes without breaking the backend.

A secondary `id ASC` sort is appended to every list query to give a stable tie-breaker under equal sort keys — this is what makes pagination deterministic.

### 12.3 Filtering

| Wire | SQL |
|---|---|
| `album=slug` | `WHERE albumSlug = 'slug'` |
| `tag=Festival` | `WHERE tags @> ARRAY['Festival']` (Postgres array containment) |
| `category=festival` | `WHERE category = 'festival'` |
| `season=spring` | `WHERE season = 'spring'` |
| `visibility=draft\|published` | `WHERE visibility = '…'` |

Unknown filter keys are passed through as `WHERE key = value` ONLY for whitelisted columns. Unknown keys return `400 validation` in Sprint 18 (services), but the repository accepts them in Sprint 17 to keep the boundary thin.

### 12.4 Search

| Wire | Strategy |
|---|---|
| `q=hanami` | App-layer: `WHERE title::text ILIKE '%hanami%' OR caption::text ILIKE '%hanami%'` |
| `fields=ja,id,en` | Restricts the `ILIKE` set to those JSONB keys |
| **Future:** `q` + `fields` on real load | Postgres `tsvector` GIN index (Sprint 20+) |

The app-layer ILIKE strategy is fine for the current data scale (~20 seeded photos, maybe 1k at most) and keeps Sprint 17 free of `pg_trgm` / `tsvector` setup.

### 12.5 Cursor vs offset (final decision)

**Offset** for Sprint 17. Justification:

- Frontend contract is already offset-based.
- Photo libraries for a personal album are small (hundreds, not millions).
- Cursor requires a stable `id`-based order — non-trivial with L10n sort + multi-key sort.

If Sprint 20+ photo count exceeds 5k, add `?cursor=` on top of `?page=` without breaking offset.

---

## 13. Testing Strategy

### 13.1 Migration Test (`tests/migration.spec.ts`)

- Bring up a throwaway Postgres (host's `postgres` cluster, fresh DB `fuurin_test_<pid>`).
- Run `prisma migrate deploy`.
- Assert every model table exists (`Album`, `Photo`, …).
- Drop the DB.

### 13.2 Seed Test (`tests/seed.spec.ts`)

- Apply migrations to a fresh DB.
- Run `prisma db seed`.
- Assert expected row counts.
- Assert every `Photo` has a matching `Media` (invariant).

### 13.3 Repository Tests (`tests/repositories/{album,media,user,upload}.spec.ts`)

Per method, in given/when/then style:

```text
given an empty DB
when repo.createDraft(...)
then repo.getDraft returns the inserted draft

given an album slug
when repo.listPhotos(slug)
then it returns the photos in idx order

given a duplicate slug
when repo.createDraft(...)
then repo returns err('conflict', ...)

given a slug that does not exist
when repo.getAlbum(slug)
then repo returns ok(null)
```

Tests use Vitest + a `setupDb()` helper that creates a per-file DB, applies migrations, and tears down on completion.

### 13.4 Database Health Test (`tests/health-db.spec.ts`)

- Real Postgres: `/healthz?check=db` returns 200 with `database.status = 'ok'`.
- Connection killed (simulated by passing a bad `DATABASE_URL`): returns 503 with `database.status = 'down'`.
- Timeout: when query takes >5s, returns 503.

### 13.5 Where tests live

`backend/tests/repositories/*.spec.ts` — repository unit tests with a real Postgres. This avoids mock-everything tests that drift from reality, while still being fast enough (Postgres on localhost ≈ <100ms round-trip).

---

## 14. Risks & Tradeoffs

| Risk | Impact | Mitigation |
|---|---|---|
| **Migration fails mid-deploy** | DB in inconsistent state; backend won't start | Pre-migration `pg_dump`; `migrate deploy` is idempotent; `verify-production` script (already exists) hits `/healthz?check=db` after deploy. |
| **Constraint conflict (`P2002`)** on concurrent create | 500 transport to client | Repositories map `P2002` → `err('conflict', …)`; frontend already handles `409` as `conflict`. |
| **Seed drift** — JSON shape changes in seed vs. domain | runtime cast errors on read | Seed uses the **same** mappers as repos; one source of truth (`prisma-to-domain.ts`). |
| **N+1 query** in `listAlbums` returning `Photo[]` | slow list endpoints | Sprint 17: `listAlbums` does NOT load photos (matches frontend `listAlbums() → AlbumSummary[]` style — `AlbumSummary` has no photo rows). `listPhotos` is a separate endpoint. Sprint 18 review may add a single `include` if needed. |
| **Transaction deadlock** on `publish`/`reorderPhotos` | 500 to client, retries slow the API | Use `Serializable` isolation; retry **once** on `P2034`; surface as `conflict` after retry. |
| **Title sort ambiguity (L10n)** | unstable ORDER BY between locales | Default sort key on Album list is `date`, not `title`. `title:asc` uses `title->>'en'` and documents that the active locale sort would be a Sprint 20+ enhancement. |
| **`BigInt` `updatedAt` overflow** | very unlikely | `BigInt` handles ms epoch up to year 292M; safe. Document it as `BigInt` in the schema. |
| **Seed re-runs overwriting user edits** | unintended data loss | Seed uses `upsert` only on natural keys — user-created rows (e.g. `UploadRecord`) are NEVER deleted. Re-running seed is additive. |
| **JSONB index growth** | larger DB | JSONB is stored in TOAST for large payloads; small L10n objects stay inline. No index on JSONB columns planned for Sprint 17. |
| **Postgres connection pool exhaustion** | intermittent 500s | Prisma client default pool (`num_physical_cpus * 2 + 1`); documented and configurable via `DATABASE_CONNECTION_LIMIT` env var (default 10). |

---

## 15. Sprint Breakdown (Task-Level)

### Task 1 — Schema (models + enums)
- Add the 8 models + 6 enums to `backend/prisma/schema.prisma` per §4.
- **Verify:** `npx prisma validate` succeeds.

### Task 2 — Initial migration
- `npx prisma migrate dev --name init` → commits `prisma/migrations/<timestamp>_init/migration.sql`.
- **Verify:** migration file present, no drift.

### Task 3 — Mapper layer
- Create `backend/src/repositories/mappers/prisma-to-domain.ts` with `toAlbum`, `toAlbumSummary`, `toPhoto`, `toMedia`, `toMember`, `toTimelineEntry`, `toUser`, `toUpload`, `toDraft`, `fromL10n`, `fromMediaId`.
- **Verify:** unit tests in `tests/mappers.spec.ts`.

### Task 4 — Sort + filter helpers
- `backend/src/repositories/queries/sort.ts` — whitelist + Prisma `orderBy` builder.
- `backend/src/repositories/queries/filter.ts` — whitelisted columns + `where` builder.
- `backend/src/repositories/queries/pagination.ts` — page→`skip`/`take`, plus `count`.
- **Verify:** unit tests in `tests/queries.spec.ts`.

### Task 5 — PrismaAlbumRepository
- Implement every method in `AlbumRepository` interface against the new schema.
- Use the mapper; use the sort/filter helpers; use transactions per §8.
- **Verify:** `tests/repositories/album.spec.ts` covers every method.

### Task 6 — PrismaMediaRepository
- Same pattern; includes `search()` (q + filter + sort).
- **Verify:** `tests/repositories/media.spec.ts`.

### Task 7 — PrismaUserRepository
- `currentUser`, `updateProfile`, `listMembers`. Auth-bound behavior stays in Sprint 20; Sprint 17 returns the seeded admin user as `currentUser()`.
- **Verify:** `tests/repositories/user.spec.ts`.

### Task 8 — PrismaUploadRepository
- `list`, `record`, `remove`, `clear`. Storage interaction (Sprint 20) goes through the `StorageProvider` already in place.
- **Verify:** `tests/repositories/upload.spec.ts`.

### Task 9 — Seed script
- `backend/prisma/seed.ts` per §10. Idempotent (upserts). Linked to `package.json` `prisma.seed`.
- **Verify:** `tests/seed.spec.ts` asserts row counts after `prisma db seed`.

### Task 10 — Database health check
- Extend `services/health-service.ts` with `checkDatabase()`; route branches on `request.query.check`.
- 5-second timeout. 200 with `database.status` on success; 503 with `database.status='down'` on failure.
- **Verify:** `tests/health-db.spec.ts`.

### Task 11 — Repository registry
- Add `backend/src/repositories/index.ts` to export `createPrismaRepositories(prisma)` returning the four implementations wired to the singleton client.
- **Verify:** `tests/registry.spec.ts` (just construction + a smoke call).

### Task 12 — Migration + verify scripts
- `backend/scripts/migrate.sh` (wraps `prisma migrate deploy`).
- `backend/scripts/verify-db.sh` (calls `/healthz?check=db`).
- **Verify:** both run successfully.

### Task 13 — Final typecheck + test + build
- `npm run typecheck`, `npm run test`, `npm run build` from `backend/`. Frontend unchanged; frontend `npm run typecheck && npm run lint && npm run build` still green.

---

## Deliverables Checklist (this plan)

- ✅ Prisma Architecture
- ✅ Entity Diagram
- ✅ Relation Diagram
- ✅ Schema Design (full Prisma models)
- ✅ Constraint Strategy
- ✅ Index Strategy
- ✅ Repository Mapping
- ✅ Transaction Strategy
- ✅ Migration Strategy
- ✅ Seed Strategy
- ✅ Health Check Strategy
- ✅ Query Strategy (pagination/sort/filter/search/cursor decision)
- ✅ Testing Strategy (migration/seed/repo/health-db)
- ✅ Risks & Tradeoffs
- ✅ Sprint Breakdown (13 tasks)

**No changes to Sprint 16 contracts.** No frontend changes. No CRUD endpoints (Sprint 18+). No auth (Sprint 20). No upload business (Sprint 20).

---

_Saved by Hermes Agent for Milestone D — Sprint 17. Awaiting approval._