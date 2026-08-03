/**
 * AlbumRepository — interface (domain only). Prisma-free.
 *
 * Mirrors the frontend `AlbumRepository` (`src/lib/repositories/album-repository.ts`)
 * method-for-method. Sprint 17 provides the Prisma-backed implementation.
 * Services depend on this interface — never on Prisma directly
 * (required refinement #5: Service → Repository Interface → Impl → Prisma).
 */

import type { Result } from '../shared/result'
import type { Album, AlbumDraft, AlbumSummary, Photo, TimelineEntry } from '../domain/models'
import type { PageResult, QueryOptions } from '../shared/paging'
import type { AlbumVisibility } from '../domain/models'

export type AlbumDraftInput = Omit<AlbumDraft, 'updatedAt'>

export interface AlbumRepository {
  /* ── Read ─────────────────────────────────────────────────── */
  listSummaries(): Promise<Result<AlbumSummary[]>>
  listAlbums(opts?: QueryOptions): Promise<Result<PageResult<Album>>>
  getAlbum(slug: string): Promise<Result<Album | null>>
  listPhotos(slug: string, opts?: QueryOptions): Promise<Result<Photo[]>>
  getPhoto(slug: string, photoId: number | string): Promise<Result<Photo | null>>
  listTimelineEntries(): Promise<Result<TimelineEntry[]>>

  /* ── Editor / write ───────────────────────────────────────── */
  existingSlugs(): Promise<Result<string[]>>
  getDraft(slug: string): Promise<Result<AlbumDraft | null>>
  createDraft(input: AlbumDraftInput, visibility: AlbumVisibility): Promise<Result<AlbumDraft>>
  updateDraft(slug: string, patch: Partial<Omit<AlbumDraft, 'slug' | 'updatedAt'>>): Promise<Result<AlbumDraft>>
  deleteDraft(slug: string): Promise<Result<void>>
  publish(slug: string): Promise<Result<AlbumDraft>>
}