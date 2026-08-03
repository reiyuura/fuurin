/**
 * Domain models — mirror the frontend DTOs (`src/types/repository-dtos.ts`)
 * and domain types (`src/types/album-editor.ts`, `src/types/media.ts`,
 * `src/lib/data` Album/Photo/MediaItem/Member/TimelineEntry).
 *
 * These are the backend's own domain shapes. Repositories return them;
 * services consume them; routes serialize them. They are the wire
 * contract both sides agree on.
 */

export type L10n = { ja: string; id: string; en: string }

export type AlbumVisibility = 'draft' | 'published'
export type Season = 'spring' | 'summer' | 'autumn' | 'winter'
export type UploadStatus = 'queued' | 'uploading' | 'completed' | 'failed' | 'cancelled'
export type UserRole = 'admin' | 'editor' | 'viewer'
export type MediaOrientation = 'landscape' | 'portrait'

/** slug + idx → stable media id (`${albumSlug}:${idx}`), parity w/ mediaId(). */
export function mediaId(albumSlug: string, idx: number): string {
  return `${albumSlug}:${idx}`
}

export type Album = {
  slug: string
  title: L10n | string
  period: L10n | string
  count: number
  views: number
  cover: string
  date: string
  season: Season
  category: string
}

export type AlbumSummary = {
  slug: string
  title: string
  date: string
  visibility: AlbumVisibility
  photoCount: number
  coverMediaId: string | null
  updatedAt: number
}

export type AlbumDraft = {
  slug: string
  title: string
  description: string
  date: string
  location: string
  visibility: AlbumVisibility
  coverMediaId: string | null
  photoIds: string[]
  updatedAt: number
}

export type Photo = {
  src: string
  caption: L10n | string
  ago: L10n | string
  album: string
  tags: string[]
  likes: number
  orientation: MediaOrientation
  idx: number
  date: string
}

export type MediaItem = {
  id: string
  albumSlug: string
  idx: number
  src: string
  caption: L10n | string
  ago: L10n | string
  tags: string[]
  likes: number
  orientation: MediaOrientation
  date: string
}

export type Member = {
  id: string
  name: L10n
  role: L10n
  initial: string
  avatar: string
}

export type TimelineEntry = {
  id: string
  date: string
  title: L10n | string
  description: L10n | string
  tag: string
  photo: string
}

export type User = {
  id: string
  name: string
  email: string
  role: UserRole
  avatar: string
}

export type Upload = {
  id: string
  fileName: string
  sizeBytes: number
  mimeType: string
  status: UploadStatus
  progress: number
  createdAt: string
  completedAt?: string
  errorMessage?: string
}

export type UploadInput = Omit<Upload, 'createdAt'>
export type UserProfilePatch = Partial<Pick<User, 'name' | 'avatar'>>