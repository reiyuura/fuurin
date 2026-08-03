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
  Photo,
  Season,
  TimelineEntry,
} from '../domain/models'

/* ── Album write inputs ──────────────────────────────────────── */

export type CreateAlbumWriteInput = {
  slug: string
  title: unknown // L10n | string (JSONB)
  period?: unknown
  cover: string
  date: string
  season: Season
  category: string
  visibility?: AlbumVisibility
  count?: number
  views?: number
  ownerId: string
}

export type UpdateAlbumWriteInput = Partial<
  Omit<CreateAlbumWriteInput, 'slug' | 'ownerId'>
>

/* ── Media / Photo write inputs ──────────────────────────────── */

export type CreateMediaWriteInput = {
  albumSlug: string
  idx: number
  src: string
  caption: unknown
  ago?: unknown
  tags?: string[]
  likes?: number
  orientation: 'landscape' | 'portrait'
  date: string
}

export type UpdateMediaWriteInput = Partial<Omit<CreateMediaWriteInput, 'albumSlug' | 'idx'>>

/* ── Timeline write inputs ───────────────────────────────────── */

export type CreateTimelineWriteInput = {
  date: string
  title: unknown
  description: unknown
  albumId?: string | null
  categoryTag?: string | null
  photo: string
}

export type UpdateTimelineWriteInput = Partial<CreateTimelineWriteInput>

/* ── Member write inputs ─────────────────────────────────────── */

export type CreateMemberWriteInput = {
  nameJa: string
  name: unknown
  role?: unknown
  avatar: string
}

export type UpdateMemberWriteInput = Partial<CreateMemberWriteInput>

/* ── Write repository interfaces ─────────────────────────────── */

export interface AlbumWriteRepository {
  createAlbum(input: CreateAlbumWriteInput): Promise<Result<Album>>
  updateAlbum(slug: string, patch: UpdateAlbumWriteInput): Promise<Result<Album>>
  /** Hard delete + cascade photos — wrapped in a transaction. */
  deleteAlbum(slug: string): Promise<Result<void>>
}

export interface MediaWriteRepository {
  createPhoto(input: CreateMediaWriteInput): Promise<Result<MediaItem>>
  updatePhoto(albumSlug: string, idx: number, patch: UpdateMediaWriteInput): Promise<Result<MediaItem>>
  deletePhoto(albumSlug: string, idx: number): Promise<Result<void>>
}

export interface TimelineWriteRepository {
  createTimeline(input: CreateTimelineWriteInput): Promise<Result<TimelineEntry>>
  updateTimeline(id: string, patch: UpdateTimelineWriteInput): Promise<Result<TimelineEntry>>
  deleteTimeline(id: string): Promise<Result<void>>
}

export interface MemberWriteRepository {
  createMember(input: CreateMemberWriteInput): Promise<Result<Member>>
  updateMember(id: string, patch: UpdateMemberWriteInput): Promise<Result<Member>>
  deleteMember(id: string): Promise<Result<void>>
}