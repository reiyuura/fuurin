# Fuurin no Class (風鈴のクラス)

Sebuah album kelas digital — nostalgic, warm, calm. Next.js 15 frontend + Fastify backend + PostgreSQL.

## Architecture

```
┌─────────────┐      ┌──────────────┐      ┌───────────┐      ┌────────────┐
│  Next.js 15 │ ───▶ │ Fastify API  │ ───▶ │  Prisma   │ ───▶ │ PostgreSQL │
│  (frontend) │      │  (backend)   │      │   ORM     │      │  (fuurin)  │
└─────────────┘      └──────────────┘      └───────────┘      └────────────┘
       │                     │
       │                     └──▶ StorageProvider (local FS)
       └──▶ Repository Pattern → FetchApiClient → /api/v1/*
```

- **Frontend**: `src/` — Next.js App Router, React 19, Tailwind v4, Repository Pattern
- **Backend**: `backend/src/` — Fastify 5, layered: Route → Controller → Service → Repository → Prisma
- **Auth**: JWT access token (Bearer) + refresh token (HTTP-only cookie, session table, rotation)
- **Authorization**: `requireAuth` + `requireRole` middleware (admin/editor/viewer)
- **Audit**: every write mutation logs to `AuditLog` table post-commit
- **Storage**: `StorageProvider` interface — `LocalStorageProvider` active; S3/R2 placeholders

## API Overview (`/api/v1`)

| Group | Endpoints | Auth |
|---|---|---|
| Read | GET /albums, /albums/:slug, /albums/:slug/photos, /media, /members, /albums/timeline, /search/* | public |
| Stats | GET /stats | public |
| Auth | POST /auth/login, /auth/refresh, /auth/logout, GET /users/me | rate-limited |
| Write | POST/PATCH/DELETE /albums, /media, /timeline, /members | admin\|editor (create/update), admin (delete) |
| Bulk | DELETE /media/bulk, PATCH /media/reorder | admin / editor |
| Upload | POST /uploads (multipart, JPEG/PNG/WEBP ≤ 10MB) | admin\|editor, rate-limited |
| Drafts | CRUD /drafts, POST /drafts/:slug/publish, /archive | editor+ |
| Health | GET /healthz | public |

## Environment Variables

**Backend** (`backend/.env`):
| Var | Required | Default | Notes |
|---|---|---|---|
| `DATABASE_URL` | ✓ | — | `postgresql://user:pass@host:5432/fuurin` |
| `JWT_SECRET` | prod | dev default | ≥32 chars; production fails validation without it |
| `JWT_ACCESS_TTL_SEC` | — | 900 | 15 min |
| `JWT_REFRESH_TTL_SEC` | — | 604800 | 7 days |
| `JWT_REFRESH_COOKIE` | — | `fuurin_rt` | HTTP-only cookie name |
| `UPLOAD_MAX_BYTES` | — | 10000000 | 10 MB |
| `STORAGE_DRIVER` | — | `local` | `local` only (S3/R2 placeholder) |
| `STORAGE_LOCAL_ROOT` | — | `./storage/uploads` | upload directory |
| `PORT` / `HOST` | — | 4001 / 127.0.0.1 | |
| `API_BASE_PATH` | — | `/api/v1` | |

**Frontend** (`.env.production`):
| Var | Notes |
|---|---|
| `NEXT_PUBLIC_API_MODE` | `fetch` (production) or `mock` (dev) |
| `NEXT_PUBLIC_API_BASE_URL` | `https://fuurin.reiyuura.pw/api` |
| `NEXT_PUBLIC_API_VERSION` | `v1` |

## Local Setup

```bash
# 1. Database
createdb fuurin
cd backend && npx prisma migrate deploy && npx prisma db seed

# 2. Backend
cd backend && npm install && npm run dev    # → http://127.0.0.1:4001

# 3. Frontend
npm install && npm run dev                  # → http://localhost:3000
```

Test users (after seed): `rei@fuurin.id / rei12345` (admin), `hana@fuurin.id / hana12345` (editor).

## Testing

```bash
# Backend (unit + integration against fuurin_test DB)
cd backend && npx vitest run          # 193 tests

# Frontend (repository + registry tests)
npx vitest run                        # 35 tests

# Type safety + lint (both must be clean)
npx tsc --noEmit && npm run lint
(cd backend && npx tsc -p tsconfig.json --noEmit)
```

## Deployment

```bash
./deploy.sh              # migrate → seed → build → restart PM2 → smoke test
./deploy.sh --skip-seed  # skip seeding
./deploy.sh --skip-build # migrate + restart + smoke only
```

PM2 services: `fuurin-backend` (:4001), `fuurin-album` (:3030). Caddy reverse proxy on :80/:443.

## Backup & Restore

```bash
./backup.sh                              # → backups/fuurin-<ts>.dump (keeps 14)
./restore.sh backups/fuurin-<ts>.dump    # interactive confirmation
```

## Security

- **Headers**: CSP, X-Content-Type-Options, X-Frame-Options, Referrer-Policy, Permissions-Policy (backend + Next.js)
- **Cookies**: HttpOnly, Secure (prod), SameSite=Lax, path-scoped `/api/v1/auth`
- **Rate limits**: login/refresh 10/min/IP, upload 30/min/IP (disabled in NODE_ENV=test)
- **Validation**: Zod on every write payload; JWT claims validated on every authed request
- **Upload**: MIME whitelist, size cap, filename sanitization, path traversal protection

## Project Status

**v1.0 Release Candidate** — Sprint 16–25 complete: Read/Write APIs, Auth, Authorization, Audit, Upload, Draft & Publish, Media Library (upload/reorder/replace/attach), Editor Workspace, security hardening, deployment automation.
