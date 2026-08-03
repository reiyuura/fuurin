/**
 * Prisma → Domain mappers — the single boundary between the data layer
 * and the rest of the backend. **No Prisma type leaks past this file.**
 *
 * Sprint 17 conventions:
 * - JSONB L10n columns become `L10n` domain objects (parsed once).
 * - `DateTime` columns (e.g. `AlbumDraft.updatedAt`) become `number`
 *   ms-epoch for the frontend contract.
 * - TimelineEntry mapper computes the wire `tag` as
 *   `album?.slug ?? categoryTag ?? 'kelas'` (matches `mock-api-client.ts`).
 * - MediaRepository builds `MediaItem.id` via `mediaId(albumSlug, idx)`.
 *
 * Prisma model types are imported with the `Pr` prefix to avoid collision
 * with the domain types re-exported from `@/domain/models`.
 */

import type {
  Album as PrAlbum,
  Photo as PrPhoto,
  AlbumDraft as PrAlbumDraft,
  Member as PrMember,
  TimelineEntry as PrTimelineEntry,
  User as PrUser,
  UploadRecord as PrUpload,
} from '@prisma/client'

import { mediaId } from '../../domain/models'
import type {
  Album,
  AlbumDraft,
  AlbumSummary,
  L10n,
  MediaItem,
  MediaOrientation,
  Member,
  Photo,
  TimelineEntry,
  Upload,
  UploadStatus,
  User,
  UserRole,
  AlbumVisibility,
  Season,
} from '../../domain/models'

// ── Helpers ──────────────────────────────────────────────────────────

/** Parse a JSONB L10n column into the domain `L10n` shape.
 *  Accepts partial payloads (`{ en: 'X' }`) — missing locales default
 *  to empty string. Strict "all 3 required" rejected legitimate
 *  single-locale writes from the frontend. */
export function fromL10n(value: unknown): L10n {
  if (typeof value === 'string') return { ja: value, id: value, en: value }
  if (value && typeof value === 'object') {
    const v = value as Record<string, unknown>
    return {
      ja: String(v.ja ?? ''),
      id: String(v.id ?? ''),
      en: String(v.en ?? ''),
    }
  }
  return { ja: '', id: '', en: '' }
}

// ── Album ────────────────────────────────────────────────────────────

export function toAlbum(p: PrAlbum): Album {
  return {
    slug: p.slug,
    title: fromL10n(p.title),
    period: fromL10n(p.period),
    count: p.count,
    views: p.views,
    cover: p.cover,
    date: p.date,
    season: p.season as Season,
    category: p.category,
  }
}

export function toAlbumSummary(p: PrAlbum): AlbumSummary {
  return {
    slug: p.slug,
    title: fromL10n(p.title).en,
    date: p.date,
    visibility: p.visibility as AlbumVisibility,
    photoCount: p.count,
    coverMediaId: mediaId(p.slug, 0),
    updatedAt: p.updatedAt.getTime(),
  }
}

// ── AlbumDraft ───────────────────────────────────────────────────────

export function toAlbumDraft(p: PrAlbumDraft): AlbumDraft {
  return {
    slug: p.slug,
    title: p.title,
    description: p.description,
    date: p.date,
    location: p.location,
    visibility: p.visibility as AlbumVisibility,
    coverMediaId: p.coverMediaId,
    photoIds: p.photoIds,
    updatedAt: p.updatedAt.getTime(),
  }
}

// ── Photo (serves both AlbumRepository.listPhotos and MediaRepository) ──

export function toPhoto(p: PrPhoto): Photo {
  return {
    src: p.src,
    caption: fromL10n(p.caption),
    ago: fromL10n(p.ago),
    album: p.albumSlug,
    tags: p.tags,
    likes: p.likes,
    orientation: p.orientation as MediaOrientation,
    idx: p.idx,
    date: p.date,
  }
}

export function toMediaItem(p: PrPhoto): MediaItem {
  return {
    id: mediaId(p.albumSlug, p.idx),
    albumSlug: p.albumSlug,
    idx: p.idx,
    src: p.src,
    caption: fromL10n(p.caption),
    ago: fromL10n(p.ago),
    tags: p.tags,
    likes: p.likes,
    orientation: p.orientation as MediaOrientation,
    date: p.date,
  }
}

// ── Member ───────────────────────────────────────────────────────────

export function toMember(p: PrMember): Member {
  return {
    id: p.id,
    name: fromL10n(p.name),
    role: fromL10n(p.role),
    initial: p.nameJa.charAt(0),
    avatar: p.avatar,
  }
}

// ── TimelineEntry ────────────────────────────────────────────────────

type PrTimelineWithAlbum = PrTimelineEntry & { album: { slug: string } | null }

export function toTimelineEntry(p: PrTimelineWithAlbum): TimelineEntry {
  const album = p.album as { slug: string } | null
  return {
    id: p.id,
    date: p.date,
    title: fromL10n(p.title),
    description: fromL10n(p.description),
    // Wire-format parity with `mock-api-client.ts: t.album ?? 'kelas'`.
    tag: album?.slug ?? p.categoryTag ?? 'kelas',
    photo: p.photo,
  }
}

// ── User ─────────────────────────────────────────────────────────────

export function toUser(p: PrUser): User {
  return {
    id: p.id,
    name: p.name,
    email: p.email,
    role: p.role as UserRole,
    avatar: p.avatar,
  }
}

// ── Upload ───────────────────────────────────────────────────────────

export function toUpload(p: PrUpload): Upload {
  return {
    id: p.id,
    fileName: p.fileName,
    sizeBytes: p.sizeBytes,
    mimeType: p.mimeType,
    status: p.status as UploadStatus,
    progress: p.progress,
    createdAt: p.createdAt.toISOString(),
    completedAt: p.completedAt?.toISOString(),
    errorMessage: p.errorMessage ?? undefined,
  }
}