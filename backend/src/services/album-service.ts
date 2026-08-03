/**
 * AlbumService — read-side business logic for albums, photos, timeline.
 *
 * Business rules live here, not in routes or repositories:
 *  - wire format: list endpoints return bare arrays (frontend parity),
 *    detail endpoints return a single object, missing → not_found
 *  - photo idx validated as non-negative integer
 *  - pagination/sort/filter forwarded to the repository QueryOptions
 */

import type { AlbumRepository } from '../repositories/album-repository'
import type { Result } from '../shared/result'
import { err, ok } from '../shared/result'
import type {
  Album,
  AlbumSummary,
  Photo,
  TimelineEntry,
} from '../domain/models'
import type { QueryOptions } from '../shared/paging'

export type AlbumServiceDeps = {
  albums: AlbumRepository
}

export function createAlbumService(deps: AlbumServiceDeps) {
  const { albums } = deps

  return {
    /** GET /albums — paginated list, wire: bare array of items. */
    async listAlbums(opts?: QueryOptions): Promise<Result<Album[]>> {
      const page = await albums.listAlbums(opts)
      if (!page.ok) return page
      return ok(page.value.items)
    },

    /** GET /albums/summaries — all summaries, date desc (frontend parity). */
    async listSummaries(): Promise<Result<AlbumSummary[]>> {
      const summaries = await albums.listSummaries()
      if (!summaries.ok) return summaries
      const sorted = [...summaries.value].sort((a, b) => b.date.localeCompare(a.date))
      return ok(sorted)
    },

    /** GET /albums/:slug — single album; null → not_found. */
    async getAlbum(slug: string): Promise<Result<Album | null>> {
      return albums.getAlbum(slug)
    },

    /** GET /albums/:slug/photos — photos of one album (bare array). */
    async listPhotos(slug: string, opts?: QueryOptions): Promise<Result<Photo[]>> {
      return albums.listPhotos(slug, opts)
    },

    /** GET /albums/:slug/photos/:idx — single photo; null → not_found. */
    async getPhoto(slug: string, photoId: number | string): Promise<Result<Photo | null>> {
      const idx = typeof photoId === 'number' ? photoId : Number(photoId)
      if (!Number.isInteger(idx) || idx < 0) {
        return err('validation', 'idx harus bilangan bulat non-negatif.', { photoId })
      }
      return albums.getPhoto(slug, idx)
    },

    /** GET /albums/timeline — chronological entries (bare array). */
    async listTimeline(): Promise<Result<TimelineEntry[]>> {
      return albums.listTimelineEntries()
    },
  }
}

export type AlbumService = ReturnType<typeof createAlbumService>