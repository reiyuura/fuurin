/**
 * DTO Mappers — one-way, read direction only (DTO → Domain).
 *
 * Per REQUIRED REFINEMENT #2: write mappers belong in a separate
 * `dto-write-mappers.ts` file added later if/when real API requests
 * need structured bodies. For now, the editor sends `AlbumDraft` JSON
 * directly through `req.body` — the mock client persists it as-is.
 *
 * Per REQUIRED REFINEMENT #3: DTOs must NEVER leak past the repository
 * layer. Mappers live here in the repositories folder and are not
 * re-exported anywhere else.
 */

import type { L10n } from '@/lib/data'
import type { Album, Member, Photo, TimelineEntry } from '@/lib/data'
import type { MediaItem } from '@/types/media'
import type {
  AlbumDto,
  L10nDto,
  MediaDto,
  MemberDto,
  PhotoDto,
  TimelineEntryDto,
  UploadDto,
  UserDto,
} from '@/types/repository-dtos'

/* ── Helpers ────────────────────────────────────────────────── */

function toL10n(v: string | L10nDto): L10n {
  if (typeof v === 'string') {
    return { ja: v, id: v, en: v }
  }
  return { ja: v.ja, id: v.id, en: v.en }
}

/* ── Album ──────────────────────────────────────────────────── */

export function toAlbum(dto: AlbumDto): Album {
  return {
    slug: dto.slug,
    title: toL10n(dto.title),
    period: toL10n(dto.period),
    count: dto.count,
    views: dto.views,
    cover: dto.cover,
    date: dto.date,
    season: dto.season,
    category: dto.category,
  }
}

/* ── Photo ──────────────────────────────────────────────────── */

export function toPhoto(dto: PhotoDto): Photo {
  return {
    src: dto.src,
    caption: toL10n(dto.caption),
    ago: toL10n(dto.ago),
    album: dto.album,
    tags: dto.tags,
    likes: dto.likes,
    orientation: dto.orientation,
  }
}

export function toPhotoWithMeta(dto: PhotoDto): Photo & { idx: number; date: string } {
  return { ...toPhoto(dto), idx: dto.idx, date: dto.date }
}

/* ── Media ──────────────────────────────────────────────────── */

export function toMediaItem(dto: MediaDto): MediaItem {
  return {
    id: dto.id ?? `${dto.albumSlug}:${dto.idx}`,
    albumSlug: dto.albumSlug,
    idx: dto.idx,
    src: dto.src,
    caption: toL10n(dto.caption),
    ago: toL10n(dto.ago),
    tags: dto.tags,
    likes: dto.likes,
    orientation: dto.orientation ?? 'landscape',
    date: dto.date,
  }
}

/* ── Member / Timeline / User / Upload ─────────────────────── */

export function toMember(dto: MemberDto): Member {
  return {
    id: dto.id,
    name: toL10n(dto.name),
    role: toL10n(dto.role),
    initial: dto.nameJa.charAt(0),
    avatar: dto.avatar,
  }
}

export function toTimelineEntry(dto: TimelineEntryDto): TimelineEntry {
  return {
    date: dto.date,
    title: toL10n(dto.title),
    body: toL10n(dto.description),
    photo: dto.photo,
    album: dto.tag,
  }
}

export function toUser(dto: UserDto): UserFromDto {
  return {
    id: dto.id,
    name: dto.name,
    email: dto.email,
    role: dto.role,
    avatar: dto.avatar,
  }
}

export function toUpload(dto: UploadDto): UploadFromDto {
  return {
    id: dto.id,
    fileName: dto.fileName,
    sizeBytes: dto.sizeBytes,
    mimeType: dto.mimeType,
    status: dto.status,
    progress: dto.progress,
    createdAt: dto.createdAt,
    completedAt: dto.completedAt,
    errorMessage: dto.errorMessage,
  }
}

/* ── Domain types inferred from DTOs where useful ─────────── */

export type UserFromDto = {
  id: string
  name: string
  email: string
  role: 'admin' | 'editor' | 'viewer'
  avatar: string
}

export type UploadFromDto = {
  id: string
  fileName: string
  sizeBytes: number
  mimeType: string
  status: 'queued' | 'uploading' | 'completed' | 'failed' | 'cancelled'
  progress: number
  createdAt: string
  completedAt?: string
  errorMessage?: string
}
