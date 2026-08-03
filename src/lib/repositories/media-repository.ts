/**
 * Media Repository — interface (Domain only).
 */

import type { MediaItem } from '@/types/media'
import type { RepositoryResult, QueryOptions } from '@/types/repository'

export interface MediaRepository {
  list(opts?: QueryOptions): Promise<RepositoryResult<MediaItem[]>>
  /** Returns `ok(null)` when no media matches. */
  get(id: string): Promise<RepositoryResult<MediaItem | null>>
  /**
   * Free-text search + optional filter/sort. Implementation may
   * delegate to the API when remote, or to local helpers when mock.
   */
  search(opts: { query: string; filter?: QueryOptions['filter']; sort?: QueryOptions['sort'] }): Promise<RepositoryResult<MediaItem[]>>
}
