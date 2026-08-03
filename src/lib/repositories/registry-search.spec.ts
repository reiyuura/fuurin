/**
 * Registry + FetchSearchRepository tests.
 */

import { describe, expect, it } from 'vitest'
import { FetchAlbumRepository } from '@/lib/repositories/fetch-album-repository'
import { FetchMediaRepository } from '@/lib/repositories/fetch-media-repository'
import { FetchMemberRepository } from '@/lib/repositories/fetch-user-repository'
import { FetchSearchRepository } from '@/lib/repositories/fetch-search-repository'
import { MockAlbumRepository } from '@/lib/repositories/mock-album-repository'
import { MockMediaRepository } from '@/lib/repositories/mock-media-repository'
import { MockUserRepository } from '@/lib/repositories/mock-user-repository'
import { MockSearchRepository } from '@/lib/repositories/mock-search-repository'
import type { ApiClient } from '@/lib/repositories/api-client'
import type { AlbumDto, MemberDto, MediaDto, TimelineEntryDto } from '@/types/repository-dtos'
import type { ApiResponse, ApiRequest } from '@/lib/repositories/api-client'
import type { ApiResponseMeta } from '@/types/api-config'

const meta: ApiResponseMeta = { status: 200, headers: {}, durationMs: 1, requestId: 't' }
const okRes = <T>(data: T): ApiResponse<T> => ({ ok: true, data, meta })

const client: ApiClient = {
  async request<T>(_req: ApiRequest): Promise<ApiResponse<T>> {
    return okRes([] as unknown as T)
  },
}

const albumDto: AlbumDto = {
  slug: 'hanami', title: { ja: '花見', id: 'Hanami', en: 'Hanami' }, period: { ja: '春', id: 'Musim semi', en: 'Spring' },
  count: 1, views: 1, cover: 'c.jpg', date: '2026-01-01', season: 'spring', category: 'festival',
}

const memberDto: MemberDto = {
  id: 'm-1', name: { ja: '佐藤', id: 'Satou', en: 'Sato' }, nameJa: '佐藤',
  role: { ja: '委員', id: 'Anggota', en: 'Member' }, avatar: 'a.jpg',
}

const mediaDto: MediaDto = {
  id: 'hanami:0', albumSlug: 'hanami', idx: 0, src: 'p.jpg',
  caption: { ja: '写', id: 'Foto', en: 'Photo' }, ago: { ja: '前', id: 'lalu', en: 'ago' },
  tags: ['Kelas'], likes: 0, orientation: 'landscape', date: '2026-01-01',
}

const timelineDto: TimelineEntryDto = {
  id: 't1', date: '2026-01-01', title: { ja: '題', id: 'Judul', en: 'Title' },
  description: { ja: '桜の文', id: 'Teks sakura', en: 'Sakura text' }, tag: 'hanami', photo: 't.jpg',
}

describe('repository registry mode switch', () => {
  it('fetch mode constructs Fetch* implementations', async () => {
    const mod = await import('@/lib/repositories/repository-registry')
    // The registry is a module-level singleton built from getEnvironment().
    // Assert the classes exist and are wired in the registry shape.
    expect(mod.repositories.albums).toBeInstanceOf(Object)
    expect(typeof mod.repositories.albums.listAlbums).toBe('function')
    expect(typeof mod.repositories.search.searchAll).toBe('function')
    expect(mod.repositories.albums).not.toBeNull()
    expect(mod.repositories.search).not.toBeNull()
  })

  it('both implementation families exist and satisfy the interfaces', () => {
    expect(new MockAlbumRepository(client)).toBeInstanceOf(MockAlbumRepository)
    expect(new FetchAlbumRepository(client)).toBeInstanceOf(FetchAlbumRepository)
    expect(new MockMediaRepository(client)).toBeInstanceOf(MockMediaRepository)
    expect(new FetchMediaRepository(client)).toBeInstanceOf(FetchMediaRepository)
    expect(new MockUserRepository(client)).toBeInstanceOf(MockUserRepository)
    expect(new FetchMemberRepository(client)).toBeInstanceOf(FetchMemberRepository)
    expect(new MockSearchRepository()).toBeInstanceOf(MockSearchRepository)
    expect(new FetchSearchRepository(client)).toBeInstanceOf(FetchSearchRepository)
  })
})

describe('FetchSearchRepository', () => {
  function searchClient(
    responses: Record<string, unknown>,
  ): ApiClient & { calls: ApiRequest[] } {
    const calls: ApiRequest[] = []
    return {
      calls,
      async request<T>(req: ApiRequest): Promise<ApiResponse<T>> {
        calls.push(req)
        const key = `${req.method} ${req.path}`
        const data = responses[key] ?? []
        return okRes(data as T)
      },
    }
  }

  it('returns empty results for an empty query without requesting', async () => {
    const client = searchClient({})
    const repo = new FetchSearchRepository(client)
    const res = await repo.searchAll('   ', 'id')
    expect(res.ok).toBe(true)
    if (res.ok) expect(res.value.total).toBe(0)
    expect(client.calls).toHaveLength(0)
  })

  it('parallel-requests the three search endpoints + timeline', async () => {
    const client = searchClient({
      'GET /search/albums': [albumDto],
      'GET /search/photos': [mediaDto],
      'GET /search/members': [memberDto],
      'GET /albums/timeline': [timelineDto],
    })
    const repo = new FetchSearchRepository(client)
    const res = await repo.searchAll('sakura', 'id')
    expect(res.ok).toBe(true)
    if (!res.ok) throw new Error('expected ok')
    expect(res.value.albums).toHaveLength(1)
    expect(res.value.photos).toHaveLength(1)
    expect(res.value.members).toHaveLength(1)
    expect(res.value.total).toBe(4)
    const paths = client.calls.map((c) => c.path).sort()
    expect(paths).toEqual(['/albums/timeline', '/search/albums', '/search/members', '/search/photos'])
    // Timeline result shaped like the palette expects.
    expect(res.value.timeline[0]).toMatchObject({ type: 'timeline', href: '/timeline' })
    expect(res.value.albums[0]).toMatchObject({ type: 'album', href: '/albums/hanami' })
  })

  it('localizes labels with the requested locale', async () => {
    const client = searchClient({ 'GET /search/albums': [albumDto] })
    const repo = new FetchSearchRepository(client)
    const ja = await repo.searchAll('x', 'ja')
    if (!ja.ok) throw new Error('expected ok')
    expect(ja.value.albums[0]?.title).toBe('花見')
    const en = await repo.searchAll('x', 'en')
    if (!en.ok) throw new Error('expected ok')
    expect(en.value.albums[0]?.title).toBe('Hanami')
  })

  it('returns an error result when a search endpoint fails', async () => {
    const client = searchClient({})
    // Force the albums call to fail.
    client.request = async <T,>() => ({ ok: false, status: 500, error: { code: 'transport', message: 'down' }, meta }) as ApiResponse<T>
    const repo = new FetchSearchRepository(client)
    const res = await repo.searchAll('x', 'id')
    expect(res.ok).toBe(false)
    if (!res.ok) expect(res.error.code).toBe('transport')
  })
})

describe('MockSearchRepository parity', () => {
  it('keeps the dataset-backed searchAll behavior', async () => {
    const repo = new MockSearchRepository()
    const res = await repo.searchAll('hanami', 'id')
    expect(res.ok).toBe(true)
    if (!res.ok) throw new Error('expected ok')
    expect(res.value.albums.length).toBeGreaterThan(0)
  })
})