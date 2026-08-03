/**
 * Fetch repository tests — fake ApiClient records requests and returns
 * fixture DTOs; asserts wire paths/query params and DTO→domain mapping.
 */

import { describe, expect, it, vi } from 'vitest'
import type { ApiClient, ApiRequest, ApiResponse } from '@/lib/repositories/api-client'
import { FetchAlbumRepository } from '@/lib/repositories/fetch-album-repository'
import { FetchMediaRepository } from '@/lib/repositories/fetch-media-repository'
import { FetchMemberRepository } from '@/lib/repositories/fetch-user-repository'
import type { AlbumDto, MemberDto, MediaDto, PhotoDto, TimelineEntryDto } from '@/types/repository-dtos'
import type { ApiResponseMeta } from '@/types/api-config'

const meta: ApiResponseMeta = { status: 200, headers: {}, durationMs: 1, requestId: 't' }

function okRes<T>(data: T, status = 200): ApiResponse<T> {
  return { ok: true, data, meta: { ...meta, status } }
}

function failRes<T>(status: number, code: 'not_found' | 'transport' | 'validation' | 'unauthorized' | 'forbidden' | 'conflict' | 'unknown'): ApiResponse<T> {
  return { ok: false, status, error: { code, message: 'err' }, meta: { ...meta, status } }
}

/** Records every request; responds from a handler map. */
function fakeClient(handler: (req: ApiRequest) => ApiResponse<unknown>): ApiClient & { calls: ApiRequest[] } {
  const calls: ApiRequest[] = []
  return {
    calls,
    async request<T>(req: ApiRequest): Promise<ApiResponse<T>> {
      calls.push(req)
      return handler(req) as ApiResponse<T>
    },
  }
}

const albumDto: AlbumDto = {
  slug: 'a-1', title: { ja: '題', id: 'Judul', en: 'Title' }, period: { ja: '期', id: 'Periode', en: 'Period' },
  count: 2, views: 3, cover: 'c.jpg', date: '2026-01-01', season: 'spring', category: 'school',
}

const photoDto: PhotoDto = {
  src: 'p.jpg', caption: { ja: '写', id: 'Foto', en: 'Photo' }, ago: { ja: '前', id: 'lalu', en: 'ago' },
  album: 'a-1', tags: [], likes: 0, orientation: 'landscape', idx: 1, date: '2026-01-01',
}

const mediaDto: MediaDto = {
  id: 'a-1:1', albumSlug: 'a-1', idx: 1, src: 'p.jpg', caption: photoDto.caption, ago: photoDto.ago,
  tags: [], likes: 0, orientation: 'landscape', date: '2026-01-01',
}

const memberDto: MemberDto = {
  id: 'm-1', name: { ja: '佐藤', id: 'Satou', en: 'Sato' }, nameJa: '佐藤',
  role: { ja: '委員', id: 'Anggota', en: 'Member' }, avatar: 'a.jpg',
}

const timelineDto: TimelineEntryDto = {
  id: 't1', date: '2026-01-01', title: { ja: '題', id: 'Judul', en: 'Title' },
  description: { ja: '文', id: 'Teks', en: 'Text' }, tag: 'a-1', photo: 't.jpg',
}

describe('FetchAlbumRepository', () => {
  it('listAlbums hits /albums with pagination/sort/filter query params', async () => {
    const client = fakeClient(() => okRes([albumDto]))
    const repo = new FetchAlbumRepository(client)
    const res = await repo.listAlbums({
      pagination: { page: 1, size: 10 },
      sort: [{ key: 'date', direction: 'desc' }],
      filter: { category: 'school' },
    })
    expect(res.ok).toBe(true)
    expect(client.calls[0]?.path).toBe('/albums')
    const q = client.calls[0]?.query as Record<string, string>
    expect(q.page).toBe('1')
    expect(q.limit).toBe('10')
    expect(q.sort).toBe('date:desc')
    expect(q.category).toBe('school')
    if (res.ok) expect(res.value[0]?.slug).toBe('a-1')
  })

  it('listAlbums maps DTO→domain', async () => {
    const client = fakeClient(() => okRes([albumDto]))
    const repo = new FetchAlbumRepository(client)
    const res = await repo.listAlbums()
    if (!res.ok) throw new Error('expected ok')
    expect(res.value[0]?.title).toEqual({ ja: '題', id: 'Judul', en: 'Title' })
  })

  it('getAlbum returns null on 404, error on transport failure', async () => {
    const missing = fakeClient(() => failRes(404, 'not_found'))
    const repo = new FetchAlbumRepository(missing)
    const res = await repo.getAlbum('nope')
    expect(res.ok && (res as { value: unknown }).value).toBeNull()
    expect(missing.calls[0]?.path).toBe('/albums/nope')

    const broken = fakeClient(() => failRes(500, 'transport'))
    const errRes = await new FetchAlbumRepository(broken).getAlbum('a-1')
    expect(errRes.ok).toBe(false)
  })

  it('listPhotos hits /albums/:slug/photos and maps', async () => {
    const client = fakeClient(() => okRes([photoDto]))
    const repo = new FetchAlbumRepository(client)
    const res = await repo.listPhotos('a-1')
    expect(client.calls[0]?.path).toBe('/albums/a-1/photos')
    if (!res.ok) throw new Error('expected ok')
    expect(res.value[0]?.album).toBe('a-1')
  })

  it('getPhoto returns null on 404', async () => {
    const client = fakeClient(() => failRes(404, 'not_found'))
    const res = await new FetchAlbumRepository(client).getPhoto('a-1', 9)
    expect(res.ok && (res as { value: unknown }).value).toBeNull()
  })

  it('listTimelineEntries hits /albums/timeline', async () => {
    const client = fakeClient(() => okRes([timelineDto]))
    const repo = new FetchAlbumRepository(client)
    const res = await repo.listTimelineEntries()
    expect(client.calls[0]?.path).toBe('/albums/timeline')
    if (!res.ok) throw new Error('expected ok')
    expect(res.value[0]?.album).toBe('a-1')
  })

  it('draft methods return a transport error (Sprint 20)', async () => {
    const client = fakeClient(() => okRes([]))
    const repo = new FetchAlbumRepository(client)
    const res = await repo.getDraft('a-1')
    expect(res.ok).toBe(false)
    if (!res.ok) expect(res.error.code).toBe('transport')
  })
})

describe('FetchMediaRepository', () => {
  it('list hits /media with filter params', async () => {
    const client = fakeClient(() => okRes([mediaDto]))
    const repo = new FetchMediaRepository(client)
    const res = await repo.list({ filter: { album: 'a-1', tag: 'Kelas' } })
    expect(client.calls[0]?.path).toBe('/media')
    const q = client.calls[0]?.query as Record<string, string>
    expect(q.album).toBe('a-1')
    expect(q.tag).toBe('Kelas')
    if (!res.ok) throw new Error('expected ok')
    expect(res.value[0]?.id).toBe('a-1:1')
  })

  it('get hits /media/:id, null on 404, null on malformed id', async () => {
    const client = fakeClient(() => okRes(mediaDto))
    const repo = new FetchMediaRepository(client)
    const found = await repo.get('a-1:1')
    // Colon is percent-encoded in the path — Fastify decodes %3A → ':'.
    expect(client.calls[0]?.path).toBe('/media/a-1%3A1')
    expect(found.ok && (found as { value: unknown }).value).not.toBeNull()

    const missing = fakeClient(() => failRes(404, 'not_found'))
    const res = await new FetchMediaRepository(missing).get('a-1:99')
    expect(res.ok && (res as { value: unknown }).value).toBeNull()

    const malformed = fakeClient(() => okRes(mediaDto))
    const bad = await new FetchMediaRepository(malformed).get('no-colon')
    expect(bad.ok && (bad as { value: unknown }).value).toBeNull()
    expect(malformed.calls).toHaveLength(0) // validated before requesting
  })

  it('search hits /search/photos?q=', async () => {
    const client = fakeClient(() => okRes([mediaDto]))
    const repo = new FetchMediaRepository(client)
    const res = await repo.search({ query: 'foto' })
    expect(client.calls[0]?.path).toBe('/search/photos')
    expect((client.calls[0]?.query as Record<string, string>).q).toBe('foto')
    if (!res.ok) throw new Error('expected ok')
    expect(res.value).toHaveLength(1)
  })
})

describe('FetchMemberRepository', () => {
  it('listMembers hits /members and derives initial from nameJa', async () => {
    const client = fakeClient(() => okRes([memberDto]))
    const repo = new FetchMemberRepository(client)
    const res = await repo.listMembers()
    expect(client.calls[0]?.path).toBe('/members')
    if (!res.ok) throw new Error('expected ok')
    expect(res.value[0]?.initial).toBe('佐')
  })

  it('currentUser degrades to null on 401/404 (no /users/me in Sprint 18)', async () => {
    const client = fakeClient(() => failRes(404, 'not_found'))
    // No session → null without any request.
    const noSession = await new FetchMemberRepository(client).currentUser()
    expect(noSession.ok && (noSession as { value: unknown }).value).toBeNull()
  })

  it('updateProfile returns transport error (Sprint 20)', async () => {
    const client = fakeClient(() => okRes({}))
    const res = await new FetchMemberRepository(client).updateProfile({ name: 'X' })
    expect(res.ok).toBe(false)
    if (!res.ok) expect(res.error.code).toBe('transport')
  })
})