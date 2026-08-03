/**
 * Query envelope — parsing IN from the wire.
 *
 * This is the server-side mirror of the frontend `toQueryParams`
 * (`src/lib/api/query-builder.ts`). The wire format is FIXED so the
 * backend can parse what the client already emits:
 *
 *   page        0-based index
 *   limit       items per page (>= 1)
 *   sort        `key:dir` or comma-joined `a:asc,b:desc`
 *   <field>     bare filter param (album=, tag=, category=, …)
 *   q           free-text search query
 *   fields      comma-joined search fields (ja,id,en)
 */

export type Direction = 'asc' | 'desc'

export type SortSpec = { key: string; direction: Direction }

export type FilterSpec = Record<string, string | number | boolean | undefined | null>

export type QueryOptions = {
  page?: number
  limit?: number
  sort?: SortSpec[]
  filter?: FilterSpec
  search?: { query?: string; fields?: string[] }
}

export type PageResult<T> = {
  items: T[]
  total: number
  page: number
  size: number
}

/** Parse the raw `URLSearchParams` into a normalized QueryOptions. */
export function parseQueryParams(
  params: URLSearchParams,
): QueryOptions {
  const pageRaw = params.get('page')
  const limitRaw = params.get('limit')
  const sortRaw = params.get('sort')
  const q = params.get('q')
  const fieldsRaw = params.get('fields')

  const page = pageRaw !== null ? Math.max(0, Number(pageRaw) || 0) : undefined
  const limit = limitRaw !== null ? Math.max(1, Number(limitRaw) || 1) : undefined

  let sort: SortSpec[] | undefined
  if (sortRaw) {
    sort = sortRaw
      .split(',')
      .filter(Boolean)
      .map((token): SortSpec => {
        const [key, dir] = token.split(':')
        const direction: Direction = dir === 'desc' ? 'desc' : 'asc'
        return { key: key ?? '', direction }
      })
      .filter((s) => s.key.length > 0)
    if (sort.length === 0) sort = undefined
  }

  let fields: string[] | undefined
  if (fieldsRaw) {
    fields = fieldsRaw
      .split(',')
      .map((f) => f.trim())
      .filter(Boolean)
  }

  // Remaining known keys are filter fields (album, tag, category, …).
  const reserved = new Set(['page', 'limit', 'sort', 'q', 'fields'])
  const filter: FilterSpec = {}
  for (const [key, value] of params.entries()) {
    if (reserved.has(key)) continue
    filter[key] = value
  }

  return {
    page,
    limit,
    sort,
    filter: Object.keys(filter).length > 0 ? filter : undefined,
    search:
      q || (fields && fields.length > 0)
        ? { query: q ?? '', fields }
        : undefined,
  }
}