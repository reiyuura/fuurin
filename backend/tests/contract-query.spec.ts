/**
 * Contract tests — the backend query parser must round-trip the exact
 * query envelopes the frontend `FetchApiClient` emits.
 */

import { describe, expect, it } from 'vitest'
import { parseQueryParams } from '../src/shared/paging'
import { buildWireUrl, toQueryParamsForTest } from './helpers/contract-harness'

describe('wire contract: pagination', () => {
  it('parses page/limit exactly as the frontend emits them', () => {
    const opts = { page: 2, limit: 24 }
    const params = toQueryParamsForTest(opts)
    expect(params.toString()).toBe('page=2&limit=24')

    const parsed = parseQueryParams(params)
    expect(parsed.page).toBe(2)
    expect(parsed.limit).toBe(24)
  })

  it('clamps negative page to 0 and zero limit to 1 (server safety)', () => {
    const parsed = parseQueryParams(new URLSearchParams('page=-3&limit=0'))
    expect(parsed.page).toBe(0)
    expect(parsed.limit).toBe(1)
  })
})

describe('wire contract: sort', () => {
  it('parses single sort key:direction', () => {
    const params = toQueryParamsForTest({ sort: [{ key: 'date', direction: 'desc' }] })
    // URLSearchParams encodes colon; the parser decodes it back to `date:desc`.
    expect(params.toString()).toBe('sort=date%3Adesc')

    const parsed = parseQueryParams(params)
    expect(parsed.sort).toEqual([{ key: 'date', direction: 'desc' }])
  })

  it('parses multi-sort comma-joined', () => {
    const opts = {
      sort: [
        { key: 'date', direction: 'desc' },
        { key: 'views', direction: 'asc' },
      ],
    }
    const params = toQueryParamsForTest(opts)
    expect(params.toString()).toBe('sort=date%3Adesc%2Cviews%3Aasc')

    const parsed = parseQueryParams(params)
    expect(parsed.sort).toEqual([
      { key: 'date', direction: 'desc' },
      { key: 'views', direction: 'asc' },
    ])
  })
})

describe('wire contract: filters', () => {
  it('passes bare filter params through (album, tag, category)', () => {
    const opts = { filter: { album: 'hanami-2026', tag: 'Festival' } }
    const params = toQueryParamsForTest(opts)
    expect(params.toString()).toBe('album=hanami-2026&tag=Festival')

    const parsed = parseQueryParams(params)
    expect(parsed.filter).toEqual({ album: 'hanami-2026', tag: 'Festival' })
  })

  it('skips empty filter values (frontend also skips them)', () => {
    const opts = { filter: { album: '', tag: 'Festival' } }
    const params = toQueryParamsForTest(opts)
    expect(params.toString()).toBe('tag=Festival')

    const parsed = parseQueryParams(params)
    expect(parsed.filter).toEqual({ tag: 'Festival' })
  })
})

describe('wire contract: search', () => {
  it('parses q and fields=ja,id,en', () => {
    const opts = { search: { query: 'hanami', fields: ['ja', 'id', 'en'] } }
    const params = toQueryParamsForTest(opts)
    expect(params.toString()).toBe('q=hanami&fields=ja%2Cid%2Cen')

    const parsed = parseQueryParams(params)
    expect(parsed.search).toEqual({ query: 'hanami', fields: ['ja', 'id', 'en'] })
  })

  it('parses full combined envelope end-to-end', () => {
    const opts = {
      page: 1,
      limit: 20,
      sort: [{ key: 'date', direction: 'desc' }],
      filter: { category: 'festival' },
      search: { query: 'sakura', fields: ['en'] },
    }
    const url = buildWireUrl(opts)
    expect(url).toContain('/api/v1/albums?')

    const parsed = parseQueryParams(new URLSearchParams(url.split('?')[1]))
    expect(parsed.page).toBe(1)
    expect(parsed.limit).toBe(20)
    expect(parsed.sort).toEqual([{ key: 'date', direction: 'desc' }])
    expect(parsed.filter).toEqual({ category: 'festival' })
    expect(parsed.search).toEqual({ query: 'sakura', fields: ['en'] })
  })
})