/**
 * Album Repository — interface (Domain only).
 *
 * Every method returns `RepositoryResult<T>` and `T` is always a
 * Domain type (no DTOs leak past the repository layer).
 */

import type { Album, Photo, TimelineEntry } from '@/lib/data'
import type {
  AlbumDraft,
  AlbumSummary,

} from '@/types/album-editor'
import type { RepositoryResult, QueryOptions, PageResult } from '@/types/repository'

export interface AlbumRepository {
  /* ── Read ─────────────────────────────────────────────────── */
  listSummaries(): Promise<RepositoryResult<AlbumSummary[]>>
  listAlbums(opts?: QueryOptions): Promise<RepositoryResult<Album[]>>
  /** Returns `ok(null)` when no album matches — no exception. */
  getAlbum(slug: string): Promise<RepositoryResult<Album | null>>
  listPhotos(slug: string, opts?: QueryOptions): Promise<RepositoryResult<Photo[]>>
  /** Returns `ok(null)` when photo not found. */
  getPhoto(slug: string, photoId: number | string): Promise<RepositoryResult<Photo | null>>
  listTimelineEntries(): Promise<RepositoryResult<TimelineEntry[]>>

  /* ── Editor / write ───────────────────────────────────────── */
  existingSlugs(): Promise<RepositoryResult<string[]>>
  /** Fetches an editor draft (built from album data + any unsaved overrides). */
  getDraft(slug: string): Promise<RepositoryResult<AlbumDraft | null>>
  createDraft(input: Omit<AlbumDraft, 'updatedAt'>): Promise<RepositoryResult<AlbumDraft>>
  updateDraft(slug: string, patch: Partial<Omit<AlbumDraft, 'slug' | 'updatedAt'>>): Promise<RepositoryResult<AlbumDraft>>
  deleteDraft(slug: string): Promise<RepositoryResult<void>>
  publish(slug: string): Promise<RepositoryResult<AlbumDraft>>
}

/* Re-export convenience for callers that want pagination shapes. */
export type { PageResult }
