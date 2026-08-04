/**
 * Contract test harness — parity verification between the frontend
 * wire format and the backend parser.
 *
 * The frontend `toQueryParams` (`src/lib/api/query-builder.ts`) emits a
 * FIXED URLSearchParams shape. This harness replicates that emitter
 * here (mirroring the frontend logic), feeds the output into the
 * backend `parseQueryParams`, and asserts the parsed QueryOptions
 * match the original intent. Any drift in the wire format breaks this
 * test — which is exactly the guarantee Sprint 16 must establish.
 */

import type { QueryOptions } from '../../src/shared/paging'

/**
 * Mirror of the frontend `toQueryParams` emitter. Keep in sync with
 * `src/lib/api/query-builder.ts` — change both or change neither.
 */
export function toQueryParamsForTest(opts?: QueryOptions): URLSearchParams {
  const params = new URLSearchParams()
  if (!opts) return params

  if (opts.page !== undefined && opts.limit !== undefined) {
    params.set('page', String(Math.max(0, opts.page)))
    params.set('limit', String(Math.max(1, opts.limit)))
  }

  if (opts.sort && opts.sort.length > 0) {
    params.set(
      'sort',
      opts.sort.map((s) => `${s.key}:${s.direction}`).join(','),
    )
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

/** Build a full URL string exactly like FetchApiClient would. */
export function buildWireUrl(opts?: QueryOptions): string {
  const params = toQueryParamsForTest(opts)
  const qs = params.toString()
  return `https://api.fuurin.local/api/v1/albums${qs ? `?${qs}` : ''}`
}