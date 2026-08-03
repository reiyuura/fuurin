/**
 * AlbumService unit tests — fake repositories, no DB.
 */

import { describe, expect, it } from 'vitest'
import { createAlbumService } from '../../src/services/album-service'
import type { AlbumRepository } from '../../src/repositories/album-repository'
import { ok } from '../../src/shared/result'
import type { Album, AlbumSummary, Photo, TimelineEntry } from '../../src/domain/models'

const album = (slug: string, date: string): Album => ({
  slug,
  title: { ja: '題', id: 'Judul', en: 'Title' },
  period: { ja: '期', id: 'Periode', en: 'Period' },
  count: 10,
  views: 5,
  cover: 'https://example.com/c.jpg',
  date,
  season: 'spring',
  category: 'school',
})

const photo = (idx: number): Photo => ({
  src: `https://example.com/p${idx}.jpg`,
  caption: { ja: '写', id: 'Foto', en: 'Photo' },
  ago: { ja: '前', id: 'lalu', en: 'ago' },
  album: 'a-1',
  tags: [],
  likes: 0,
  orientation: 'landscape',
  idx,
  date: '2026-01-01',
})

function fakeRepo(overrides: Partial<AlbumRepository> = {}): AlbumRepository {
  return {
    listSummaries: async () =>
      ok<AlbumSummary[]>([
        { slug: 'b', title: 'B', date: '2026-02-01', visibility: 'published', photoCount: 1, coverMediaId: 'b:0', updatedAt: 2 },
        { slug: 'a', title: 'A', date: '2026-01-01', visibility: 'published', photoCount: 1, coverMediaId: 'a:0', updatedAt: 1 },
      ]),
    listAlbums: async () => ok({ items: [album('a-1', '2026-01-01')], total: 1, page: 0, size: 20 }),
    getAlbum: async (slug: string) => ok(slug === 'a-1' ? album('a-1', '2026-01-01') : null),
    listPhotos: async (slug: string) => ok(slug === 'a-1' ? [photo(0), photo(1)] : []),
    getPhoto: async (slug: string, idx: number | string) => ok(slug === 'a-1' && Number(idx) === 0 ? photo(0) : null),
    listTimelineEntries: async () =>
      ok<TimelineEntry[]>([
        { id: 't1', date: '2026-01-01', title: 'T', description: 'D', tag: 'kelas', photo: 'https://example.com/t.jpg' },
      ]),
    ...overrides,
  }
}

describe('AlbumService', () => {
  it('listAlbums returns the bare items array (wire parity)', async () => {
    const svc = createAlbumService({ albums: fakeRepo() })
    const r = await svc.listAlbums()
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.value).toEqual([album('a-1', '2026-01-01')])
  })

  it('listSummaries sorts by date desc', async () => {
    const svc = createAlbumService({ albums: fakeRepo() })
    const r = await svc.listSummaries()
    if (!r.ok) throw new Error('expected ok')
    expect(r.value.map((s) => s.slug)).toEqual(['b', 'a'])
  })

  it('getAlbum returns the album when found, null otherwise', async () => {
    const svc = createAlbumService({ albums: fakeRepo() })
    const found = await svc.getAlbum('a-1')
    expect(found.ok && (found as { value: Album | null }).value?.slug).toBe('a-1')
    const missing = await svc.getAlbum('nope')
    expect(missing.ok && (missing as { value: Album | null }).value).toBeNull()
  })

  it('listPhotos forwards the album slug', async () => {
    const svc = createAlbumService({ albums: fakeRepo() })
    const r = await svc.listPhotos('a-1')
    if (!r.ok) throw new Error('expected ok')
    expect(r.value).toHaveLength(2)
    const empty = await svc.listPhotos('nope')
    if (!empty.ok) throw new Error('expected ok')
    expect(empty.value).toHaveLength(0)
  })

  it('getPhoto returns null when missing', async () => {
    const svc = createAlbumService({ albums: fakeRepo() })
    const r = await svc.getPhoto('a-1', 9)
    expect(r.ok && (r as { value: Photo | null }).value).toBeNull()
  })

  it('getPhoto rejects a negative idx as validation', async () => {
    const svc = createAlbumService({ albums: fakeRepo() })
    const r = await svc.getPhoto('a-1', -1)
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error.code).toBe('validation')
  })

  it('listTimeline returns entries', async () => {
    const svc = createAlbumService({ albums: fakeRepo() })
    const r = await svc.listTimeline()
    if (!r.ok) throw new Error('expected ok')
    expect(r.value).toHaveLength(1)
  })
})