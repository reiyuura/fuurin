/**
 * query-builder — pure: QueryOptions → URLSearchParams.
 *
 * Used by repository code via `toQueryParams` so no caller builds a
 * query string by hand. Pagination, sort, filter, and search each
 * have well-defined keys; the actual wire format stays here.
 */

import type { QueryOptions } from '@/types/repository'

/**
 * Canonical wire format (stable across providers):
 *   pagination.page  → page
 *   pagination.size  → limit
 *   sort = [{ key: 'date', direction: 'desc' }]
 *                    → sort=date:desc  (multi → sort=a:asc,b:desc)
 *   filter.field     → field=value
 *   search.query     → q
 *   search.fields    → fields=ja,id,en (csv)
 */
export function toQueryParams(opts?: QueryOptions): URLSearchParams {
  const params = new URLSearchParams()
  if (!opts) return params

  if (opts.pagination) {
    params.set('page', String(Math.max(0, opts.pagination.page)))
    params.set('limit', String(Math.max(1, opts.pagination.size)))
  }

  const sorts = opts.sort ? (Array.isArray(opts.sort) ? opts.sort : [opts.sort]) : []
  if (sorts.length > 0) {
    params.set('sort', sorts.map((s) => `${s.key}:${s.direction}`).join(','))
  }

  if (opts.filter) {
    for (const [field, value] of Object.entries(opts.filter)) {
      if (value === undefined || value === null || value === '') continue
      params.set(field, String(value))
    }
  }

  if (opts.search) {
    if (opts.search.query) params.set('q', opts.search.query)
    if (opts.search.fields && opts.search.fields.length > 0) {
      params.set('fields', opts.search.fields.join(','))
    }
  }

  return params
}
