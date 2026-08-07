/**
 * MockApiClient — in-memory DTO store that returns ApiResponse shapes.
 *
 * Routes by `path`. Latency simulated (~80ms) so consumers behave
 * like they would against a real network. This module is the ONLY
 * place that imports raw seed literals from `@/lib/data`.
 *
 * Sprint 14 replaces this with `FetchApiClient`; nothing else changes.
 */

import { ALBUMS, CURRENT_USER, MEMBERS, RECENT_PHOTOS, TIMELINE } from '@/lib/data'
import { mediaId } from '@/types/media'
import {
  codeFromStatus,
  type ApiClient,
  type ApiRequest,
  type ApiResponse,
} from './api-client'
import { err as apiErr } from './result-helpers'
import type {
  AlbumDraftInputDto,
  AlbumDraftPatchDto,
  AlbumDto,
  MediaDto,
  MemberDto,
  PhotoDto,
  TimelineEntryDto,
  UploadDto,
  UserDto,
} from '@/types/repository-dtos'

const MOCK_LATENCY_MIN_MS = 50
const MOCK_LATENCY_MAX_MS = 120

function delay(): Promise<void> {
  const ms = MOCK_LATENCY_MIN_MS + Math.random() * (MOCK_LATENCY_MAX_MS - MOCK_LATENCY_MIN_MS)
  return new Promise((r) => setTimeout(r, ms))
}

function slugHash(slug: string): number {
  let h = 0
  for (let i = 0; i < slug.length; i++) h = (h * 31 + slug.charCodeAt(i)) >>> 0
  return h
}

function deriveOrientation(src: string): 'landscape' | 'portrait' {
  let h = 0
  for (let i = 0; i < src.length; i++) h = (h * 31 + src.charCodeAt(i)) >>> 0
  return h % 10 < 6 ? 'landscape' : 'portrait'
}

/* ── Inline photo corpus (private to mock layer) ───────────── */

const PHOTO_URLS = [
  'https://images.unsplash.com/photo-1500534623283-312aade485b7?auto=format&fit=crop&w=800&q=85',
  'https://images.unsplash.com/photo-1512428559087-560fa5ceab42?auto=format&fit=crop&w=800&q=85',
  'https://images.unsplash.com/photo-1490806843957-31f4c9a91c65?auto=format&fit=crop&w=800&q=85',
  'https://images.unsplash.com/photo-1522383225653-ed111181a951?auto=format&fit=crop&w=800&q=85',
  'https://images.unsplash.com/photo-1513159446162-54eb8bdaa79b?auto=format&fit=crop&w=800&q=85',
  'https://images.unsplash.com/photo-1482575832494-771f74bf6857?auto=format&fit=crop&w=800&q=85',
  'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=800&q=85',
  'https://images.unsplash.com/photo-1524178232363-1fb2b075b655?auto=format&fit=crop&w=800&q=85',
  'https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&w=800&q=85',
  'https://images.unsplash.com/photo-1509062522246-3755977927d7?auto=format&fit=crop&w=800&q=85',
  'https://images.unsplash.com/photo-1519677100203-a0e668c92439?auto=format&fit=crop&w=800&q=85',
  'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&w=800&q=85',
  'https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=800&q=85',
  'https://images.unsplash.com/photo-1511795409834-ef04bbd61622?auto=format&fit=crop&w=800&q=85',
  'https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?auto=format&fit=crop&w=800&q=85',
]

const PHOTO_CAPTIONS = [
  { ja: '教室の窓辺で', id: 'Di tepi jendela kelas', en: 'By the classroom window' },
  { ja: 'みんなで昼休み', id: 'Istirahat siang bersama', en: 'Lunch break together' },
  { ja: '桜の下で', id: 'Di bawah pohon sakura', en: 'Under the sakura tree' },
  { ja: '発表の練習', id: 'Latihan presentasi', en: 'Presentation practice' },
  { ja: '屋台で遊ぶ', id: 'Bermain di stan', en: 'Having fun at the stalls' },
  { ja: '教室の後ろから', id: 'Dari belakang kelas', en: 'From the back of class' },
  { ja: '旅の途中で', id: 'Di tengah perjalanan', en: 'On the way' },
  { ja: '放課後のひととき', id: 'Saat setelah sekolah', en: 'After school moment' },
  { ja: 'みんなの笑顔', id: 'Senyum semua orang', en: 'Everyone smiling' },
  { ja: '夜景を見ながら', id: 'Menikmati lampu malam', en: 'Enjoying the night lights' },
  { ja: '記念写真', id: 'Foto kenang-kenangan', en: 'Group photo' },
  { ja: '小さな発見', id: 'Penemuan kecil', en: 'A little discovery' },
  { ja: '教室の飾り付け', id: 'Menghias kelas', en: 'Decorating the classroom' },
  { ja: '夕暮れの帰り道', id: 'Pulang saat senja', en: 'Walking home at dusk' },
]

const PHOTO_TAGS = ['Kelas', 'Festival', 'Belajar', 'Travel', 'Makan', 'Cultural']

/* ── Seeded DTO projections ───────────────────────────────── */

function seedAlbums(): AlbumDto[] {
  return ALBUMS.map((a) => ({
    slug: a.slug,
    title: a.title,
    period: a.period,
    count: a.count,
    views: a.views,
    cover: a.cover,
    date: a.date,
    season: a.season,
    category: a.category,
  }))
}

function seedPhotos(): PhotoDto[] {
  const out: PhotoDto[] = []
  for (const album of ALBUMS) {
    const seed = slugHash(album.slug)
    const count = 36
    for (let i = 0; i < count; i++) {
      const url = PHOTO_URLS[(seed + i) % PHOTO_URLS.length]
      const caption = PHOTO_CAPTIONS[(seed + i * 3) % PHOTO_CAPTIONS.length]
      const likes = 10 + ((seed + i * 7) % 140)
      const tagCount = 1 + ((seed + i) % 3)
      const tags = Array.from(
        { length: tagCount },
        (_, t) => PHOTO_TAGS[(seed + i * 5 + t * 11) % PHOTO_TAGS.length],
      )
      out.push({
        src: url,
        caption,
        ago: { ja: `${i + 1}日前`, id: `${i + 1} hari lalu`, en: `${i + 1} days ago` },
        album: album.slug,
        tags,
        likes,
        orientation: deriveOrientation(url),
        idx: i,
        date: album.date,
      })
    }
  }
  return out
}

function seedRecent(): PhotoDto[] {
  return RECENT_PHOTOS.map((p, idx) => ({
    src: p.src,
    caption: p.caption,
    ago: p.ago,
    album: p.album,
    tags: p.tags,
    likes: p.likes,
    orientation: p.orientation ?? deriveOrientation(p.src),
    idx,
    date: ALBUMS.find((a) => a.slug === p.album)?.date ?? '2026-01-01',
  }))
}

function seedMedia(): MediaDto[] {
  return seedPhotos().map((p) => ({
    id: mediaId(p.album, p.idx),
    albumSlug: p.album,
    idx: p.idx,
    src: p.src,
    caption: p.caption,
    ago: p.ago,
    tags: p.tags,
    likes: p.likes,
    orientation: p.orientation ?? 'landscape',
    date: p.date,
  }))
}

function seedMembers(): MemberDto[] {
  return MEMBERS.map((m) => ({
    id: m.id,
    name: m.name,
    nameJa: m.name.ja,
    role: m.role,
    avatar: m.avatar,
  }))
}

function seedTimeline(): TimelineEntryDto[] {
  return TIMELINE.map((t, idx) => ({
    id: `tl-${idx}-${t.date}`,
    date: t.date,
    title: t.title,
    description: t.body,
    tag: t.album ?? 'kelas',
    photo: t.photo ?? '',
  }))
}

function seedUser(): UserDto {
  return {
    id: 'u-rei',
    name: CURRENT_USER.name,
    email: 'rei@fuurin.id',
    role: 'admin',
    avatar: CURRENT_USER.avatar,
  }
}

/* ── Mock store ────────────────────────────────────────────── */

class MockStore {
  albums: AlbumDto[] = seedAlbums()
  photos: PhotoDto[] = seedPhotos()
  recent: PhotoDto[] = seedRecent()
  media: MediaDto[] = seedMedia()
  members: MemberDto[] = seedMembers()
  timeline: TimelineEntryDto[] = seedTimeline()
  user: UserDto = seedUser()
  uploads: UploadDto[] = []
  drafts: AlbumDraftInputDto[] = []
}

const store = new MockStore()

/* ── Routing ───────────────────────────────────────────────── */

type Handler = (req: ApiRequest) => unknown | Promise<unknown>

const ROUTES: Array<{ method: string; pattern: RegExp; handle: Handler }> = []

function compile(path: string): RegExp {
  const body = path
    .split('/')
    .map((seg) => (seg.startsWith(':') ? '([^/]+)' : seg.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')))
    .join('/')
  return new RegExp(`^${body}$`)
}

function route(method: string, path: string, handle: Handler) {
  ROUTES.push({ method, pattern: compile(path), handle })
}

function getParam(req: ApiRequest, pattern: RegExp, group = 1): string {
  const m = req.path.match(pattern)
  return m ? decodeURIComponent(m[group]) : ''
}

function findRoute(method: string, source: RegExp['source']): RegExp | null {
  return ROUTES.find((r) => r.method === method && r.pattern.source === source)?.pattern ?? null
}

function ok<T>(data: T): ApiResponse<T> {
  return {
    ok: true,
    data,
    meta: { status: 200, headers: {}, durationMs: 0, requestId: 'mock' },
  }
}

function fail<T>(status: number, message: string): ApiResponse<T> {
  return {
    ok: false,
    status,
    error: { code: codeFromStatus(status), message },
    meta: { status, headers: {}, durationMs: 0, requestId: 'mock' },
  }
}

function statusFromErrorCode(code: string | undefined): number {
  switch (code) {
    case 'unauthorized': return 401
    case 'forbidden': return 403
    case 'not_found': return 404
    case 'conflict': return 409
    case 'validation': return 400
    case 'transport': return 500
    default: return 500
  }
}

/* Albums */
route('GET', '/albums', () => store.albums)
route('GET', '/albums/summaries', () =>
  store.albums
    .slice()
    .sort((a, b) => b.date.localeCompare(a.date))
    .map((a) => ({
      slug: a.slug,
      title: typeof a.title === 'string' ? a.title : a.title.en ?? a.title.ja,
      date: a.date,
      visibility: 'published' as const,
      photoCount: a.count,
      coverMediaId: mediaId(a.slug, 0),
      updatedAt: 1_700_000_000_000 + slugHash(a.slug),
    })),
)
route('GET', '/albums/:slug', (req) => {
  const re = findRoute('GET', '^\\/albums\\/([^/]+)$')!
  const slug = getParam(req, re)
  const found = store.albums.find((a) => a.slug === slug)
  return found ?? apiErr('not_found', 'Album not found', null)
})
route('GET', '/albums/:slug/photos', (req) => {
  const re = findRoute('GET', '^\\/albums\\/([^/]+)\\/photos$')!
  const slug = getParam(req, re)
  return store.photos.filter((p) => p.album === slug)
})
route('GET', '/albums/:slug/photos/:idx', (req) => {
  const re = findRoute('GET', '^\\/albums\\/([^/]+)\\/photos\\/([^/]+)$')!
  const m = req.path.match(re)
  if (!m) return apiErr('not_found', 'Photo not found', null)
  const slug = decodeURIComponent(m[1])
  const idx = Number(m[2])
  const found = store.photos.find((p) => p.album === slug && p.idx === idx)
  return found ?? apiErr('not_found', 'Photo not found', null)
})
route('GET', '/albums/timeline', () => store.timeline)

/* Album drafts (editor) */
route('POST', '/albums/drafts', (req) => {
  const body = req.body as AlbumDraftInputDto
  if (store.drafts.some((d) => d.slug === body.slug)) {
    return apiErr('conflict', 'slug exists', null)
  }
  const created: AlbumDraftInputDto = { ...body, updatedAt: Date.now() }
  store.drafts.push(created)
  return created
})
// Specific routes must register BEFORE parameterized ones — matching is
// first-match-wins, so '/albums/drafts/slugs' before '/albums/drafts/:slug'
// (otherwise "slugs" is swallowed by the ':slug' parameter).
route('GET', '/albums/drafts/slugs', () => store.drafts.map((d) => d.slug))
route('GET', '/albums/drafts/:slug', (req) => {
  const re = findRoute('GET', '^\\/albums\\/drafts\\/([^/]+)$')!
  const slug = getParam(req, re)
  const found = store.drafts.find((d) => d.slug === slug)
  return found ?? apiErr('not_found', 'Draft not found', null)
})
route('PATCH', '/albums/drafts/:slug', (req) => {
  const re = findRoute('PATCH', '^\\/albums\\/drafts\\/([^/]+)$')!
  const slug = getParam(req, re)
  const idx = store.drafts.findIndex((d) => d.slug === slug)
  if (idx < 0) return apiErr('not_found', 'Draft not found', null)
  const patch = req.body as AlbumDraftPatchDto
  const next: AlbumDraftInputDto = { ...store.drafts[idx], ...patch, slug, updatedAt: Date.now() }
  store.drafts[idx] = next
  return next
})
route('DELETE', '/albums/drafts/:slug', (req) => {
  const re = findRoute('DELETE', '^\\/albums\\/drafts\\/([^/]+)$')!
  const slug = getParam(req, re)
  const before = store.drafts.length
  store.drafts = store.drafts.filter((d) => d.slug !== slug)
  if (store.drafts.length === before) return apiErr('not_found', 'Draft not found', null)
  return { slug }
})

/* Media */
route('GET', '/media', (req) => {
  const albumFilter = req.query?.album
  const tagFilter = req.query?.tag
  let pool = store.media
  if (albumFilter) pool = pool.filter((m) => m.albumSlug === albumFilter)
  if (tagFilter) pool = pool.filter((m) => m.tags.includes(String(tagFilter)))
  return pool
})

/* Members / users */
route('GET', '/members', () => store.members)
route('GET', '/users/me', () => store.user)
route('PATCH', '/users/me', (req) => {
  const patch = (req.body ?? {}) as Partial<UserDto>
  store.user = { ...store.user, ...patch }
  return store.user
})

/* Uploads */
route('GET', '/uploads', () => store.uploads)
route('POST', '/uploads', (req) => {
  const body = req.body as UploadDto
  const next: UploadDto = { ...body, createdAt: new Date().toISOString() }
  store.uploads.unshift(next)
  return next
})
route('DELETE', '/uploads/:id', (req) => {
  const re = findRoute('DELETE', '^\\/uploads\\/([^/]+)$')!
  const id = getParam(req, re)
  const before = store.uploads.length
  store.uploads = store.uploads.filter((u) => u.id !== id)
  if (store.uploads.length === before) return apiErr('not_found', 'Upload not found', null)
  return { id }
})
route('DELETE', '/uploads', () => {
  store.uploads = []
  return { cleared: true }
})

/* ── Client impl ───────────────────────────────────────────── */

export class MockApiClient implements ApiClient {
  async request<T>(req: ApiRequest): Promise<ApiResponse<T>> {
    await delay()

    const methodRoutes = ROUTES.filter((r) => r.method === req.method)
    const compiled = methodRoutes.find((r) => r.pattern.test(req.path))
    if (!compiled) {
      return {
        ok: false,
        status: 404,
        error: { code: codeFromStatus(404), message: `No mock route for ${req.method} ${req.path}` },
        meta: { status: 404, headers: {}, durationMs: 0, requestId: 'mock' },
      }
    }

    try {
      const result = await compiled.handle(req)
      if (result && typeof result === 'object' && 'ok' in result) {
        // Route returned a RepositoryResult (apiErr shorthand).
        // Lift it into an ApiResponse with the same shape as fetch.
        const r = result as { ok: boolean; error?: { code: string; message: string } }
        if (r.ok === false) {
          return fail<T>(statusFromErrorCode(r.error?.code), r.error?.message ?? 'Error')
        }
        return ok(result as T)
      }
      return ok(result as T)
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : 'mock error'
      return {
        ok: false,
        status: 500,
        error: { code: codeFromStatus(500), message },
        meta: { status: 500, headers: {}, durationMs: 0, requestId: 'mock' },
      }
    }
  }
}
