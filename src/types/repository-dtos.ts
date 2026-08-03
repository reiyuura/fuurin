/**
 * Repository DTOs — wire-format types.
 *
 * These shapes mirror what a real API would return. They are NEVER
 * exposed past the repository layer — every method returns Domain
 * types wrapped in `RepositoryResult`. Adding a new field here is
 * safe; adding one to the domain requires touching the mapper too.
 */

import type { AlbumCategory, Photo } from '@/lib/data'

export type L10nDto = { ja: string; id: string; en: string }

export type AlbumDto = {
  slug: string
  title: string | L10nDto
  period: string | L10nDto
  count: number
  views: number
  cover: string
  date: string
  season: 'spring' | 'summer' | 'autumn' | 'winter'
  category: AlbumCategory
}

export type PhotoDto = Omit<Photo, 'caption' | 'ago' | 'orientation'> & {
  caption: string | L10nDto
  ago: string | L10nDto
  orientation?: Photo['orientation']
  idx: number
  date: string
}

export type MediaDto = {
  /** Stable id assigned by the API: `${albumSlug}:${idx}`. */
  id?: string
  albumSlug: string
  idx: number
  src: string
  caption: string | L10nDto
  ago: string | L10nDto
  tags: string[]
  likes: number
  orientation: Photo['orientation']
  date: string
}

export type MemberDto = {
  id: string
  name: L10nDto
  nameJa: string
  /** Free-form role label rendered as L10n. */
  role: string | L10nDto
  avatar: string
}

export type TimelineEntryDto = {
  id: string
  date: string
  title: string | L10nDto
  description: string | L10nDto
  tag: string
  photo: string
}

export type UploadDto = {
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

export type UserDto = {
  id: string
  name: string
  email: string
  role: 'admin' | 'editor' | 'viewer'
  avatar: string
}

/**
 * Draft CRUD shapes — keep loose; Sprint 14 will replace with proper
 * write DTOs (`dto-write-mappers.ts` per REQUIRED REFINEMENT #2).
 */
export type AlbumDraftInputDto = {
  slug: string
  title: string
  description: string
  date: string
  location: string
  visibility: 'draft' | 'published'
  coverMediaId: string | null
  photoIds: string[]
  updatedAt: number
}

export type AlbumDraftPatchDto = Partial<Omit<AlbumDraftInputDto, 'slug' | 'updatedAt'>>
