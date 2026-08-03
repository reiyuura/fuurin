/**
 * MediaRepository — interface (domain only). Prisma-free.
 *
 * Mirrors the frontend `MediaRepository` (`src/lib/repositories/media-repository.ts`).
 */

import type { Result } from '../shared/result'
import type { MediaItem } from '../domain/models'
import type { QueryOptions } from '../shared/paging'

export interface MediaRepository {
  list(opts?: QueryOptions): Promise<Result<MediaItem[]>>
  get(id: string): Promise<Result<MediaItem | null>>
  search(opts: {
    query: string
    filter?: QueryOptions['filter']
    sort?: QueryOptions['sort']
  }): Promise<Result<MediaItem[]>>
}