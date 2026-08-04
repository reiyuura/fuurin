/**
 * Write API — repository interface extensions (Sprint 19).
 *
 * Services depend on these interfaces; Prisma stays behind the
 * implementation. Every method returns Result<T> — never throws.
 */

import type { Result } from '../shared/result'
import type {
  Album,
  AlbumVisibility,
  Member,
  MediaItem,
  Season,
  TimelineEntry,
} from '../domain/models'

// ── Album ──────────────────────────────────────────────────────

export type CreateAlbumWriteInput = {
  slug: string
  title: string | Record<string, string>
  period?: string | Record<string, string>
  cover: string
  date: string
  season: Season
  category: string
  visibility?: AlbumVisibility
  count?: number
  views?: number
  ownerId: string
}

export type UpdateAlbumWriteInput = Partial<{
  title: string | Record<string, string>
  period: string | Record<string, string>
  cover: string
  date: string
  season: Season
  category: string
  visibility: AlbumVisibility
  count: number
  views: number
}>

export interface AlbumWriteRepository {
  createAlbum(input: CreateAlbumWriteInput): Promise<Result<Album>>
  updateAlbum(slug: string, patch: UpdateAlbumWriteInput): Promise<Result<Album>>
  deleteAlbum(slug: string): Promise<Result<void>>
  /** Sprint 23.5: atomic publish — create/update album + mark draft published
   *  inside a single Prisma.$transaction. */
  publishDraft(draft: {
    slug: string; title: string; description?: string; date?: string; cover?: string
    ownerId: string
  }): Promise<Result<Album>>
}

// ── Media / Photo ──────────────────────────────────────────────

export type CreateMediaWriteInput = {
  albumSlug: string
  idx: number
  src: string
  caption: string | Record<string, string>
  ago?: string | Record<string, string>
  tags?: string[]
  likes?: number
  orientation: 'landscape' | 'portrait'
  date: string
}

export type UpdateMediaWriteInput = Partial<{
  src: string
  caption: string | Record<string, string>
  ago: string | Record<string, string>
  tags: string[]
  likes: number
  orientation: 'landscape' | 'portrait'
  date: string
}>

export interface MediaWriteRepository {
  createPhoto(input: CreateMediaWriteInput): Promise<Result<MediaItem>>
  updatePhoto(albumSlug: string, idx: number, patch: UpdateMediaWriteInput): Promise<Result<MediaItem>>
  deletePhoto(albumSlug: string, idx: number): Promise<Result<void>>
  deletePhotos(ids: string[]): Promise<Result<number>>
  reorderPhotos(albumSlug: string, orderedIds: string[]): Promise<Result<void>>
}

// ── Timeline ───────────────────────────────────────────────────

export type CreateTimelineWriteInput = {
  date: string
  title: string | Record<string, string>
  description: string | Record<string, string>
  albumId?: string | null
  categoryTag?: string | null
  photo: string
}

export type UpdateTimelineWriteInput = Partial<{
  date: string
  title: string | Record<string, string>
  description: string | Record<string, string>
  albumId: string | null
  categoryTag: string | null
  photo: string
}>

export interface TimelineWriteRepository {
  createTimeline(input: CreateTimelineWriteInput): Promise<Result<TimelineEntry>>
  updateTimeline(id: string, patch: UpdateTimelineWriteInput): Promise<Result<TimelineEntry>>
  deleteTimeline(id: string): Promise<Result<void>>
}

// ── Member ─────────────────────────────────────────────────────

export type CreateMemberWriteInput = {
  nameJa: string
  name: string | Record<string, string>
  role?: string | Record<string, string>
  avatar: string
}

export type UpdateMemberWriteInput = Partial<{
  nameJa: string
  name: string | Record<string, string>
  role: string | Record<string, string>
  avatar: string
}>

export interface MemberWriteRepository {
  createMember(input: CreateMemberWriteInput): Promise<Result<Member>>
  updateMember(id: string, patch: UpdateMemberWriteInput): Promise<Result<Member>>
  deleteMember(id: string): Promise<Result<void>>
}