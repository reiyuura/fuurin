/**
 * MockSearchRepository — mock-mode search.
 *
 * Wraps the existing dataset-backed `searchAll` (src/lib/search-utils)
 * so mock mode behavior is byte-identical to pre-integration.
 */

import type { SearchRepository } from './search-repository'
import { ok } from './result-helpers'
import type { RepositoryResult } from './result-helpers'
import { ALBUMS, MEMBERS, RECENT_PHOTOS, TIMELINE, type Album, type Member, type Photo, type TimelineEntry } from '@/lib/data'
import { searchAll, type SearchResults } from '@/lib/search-utils'
import type { Locale } from '@/lib/i18n'

export class MockSearchRepository implements SearchRepository {
  async searchAll(query: string, locale: Locale): Promise<RepositoryResult<SearchResults>> {
    const results = searchAll(
      {
        albums: ALBUMS as Album[],
        photos: RECENT_PHOTOS as Photo[],
        members: MEMBERS as Member[],
        timeline: TIMELINE as TimelineEntry[],
      },
      query,
      locale,
    )
    return ok(results)
  }
}