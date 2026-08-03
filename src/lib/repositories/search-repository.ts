/**
 * SearchRepository — unified search across albums/photos/members/timeline.
 *
 * Returns the same `SearchResults` shape the UI already consumes
 * (`search-utils.ts`), so the palette never changes between modes.
 */

import type { RepositoryResult } from './result-helpers'
import type { Locale } from '@/lib/i18n'
import type { SearchResults } from '@/lib/search-utils'

export interface SearchRepository {
  /** Search every dataset for `query`, labels localized with `locale`. */
  searchAll(query: string, locale: Locale): Promise<RepositoryResult<SearchResults>>
}