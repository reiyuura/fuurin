/**
 * MediaRepository — read+write composite (Sprint 19).
 *
 * `MockMediaRepository` only implements the read side; the write side
 * returns a `transport` error in mock mode (no backend write support
 * locally). `FetchMediaRepository` implements both.
 */

import type { MediaItem } from '@/types/media'
import type { RepositoryResult, QueryOptions } from '@/types/repository'

export interface MediaReadRepository {
  list(opts?: QueryOptions): Promise<RepositoryResult<MediaItem[]>>
  /** Returns `ok(null)` when no media matches. */
  get(id: string): Promise<RepositoryResult<MediaItem | null>>
  /**
   * Free-text search + optional filter/sort. Implementation may
   * delegate to the API when remote, or to local helpers when mock.
   */
  search(opts: { query: string; filter?: QueryOptions['filter']; sort?: QueryOptions['sort'] }): Promise<RepositoryResult<MediaItem[]>>
}

export interface MediaWriteRepository {
  /** Create metadata for a new photo. Idx must be unique per album. */
  createPhoto(input: {
    albumSlug: string
    idx: number
    src: string
    caption: unknown
    ago?: unknown
    tags?: string[]
    likes?: number
    orientation: 'landscape' | 'portrait'
    date: string
  }): Promise<RepositoryResult<MediaItem>>

  updatePhoto(
    albumSlug: string,
    idx: number,
    patch: Partial<{
      src: string
      caption: unknown
      ago: unknown
      tags: string[]
      likes: number
      orientation: 'landscape' | 'portrait'
      date: string
    }>,
  ): Promise<RepositoryResult<MediaItem>>

  deletePhoto(albumSlug: string, idx: number): Promise<RepositoryResult<void>>
}

export interface MediaRepository extends MediaReadRepository, MediaWriteRepository {}
