/**
 * AlbumRepository tests — every method, in given/when/then form.
 * Uses a real test Postgres (`fuurin_test`) — no mocks.
 */

import { afterAll, beforeEach, describe, expect, it } from 'vitest'
import type { PrismaClient } from '@prisma/client'
import { PrismaAlbumRepository } from '../../src/repositories/prisma-album-repository'
import { truncateAll, getTestPrisma, disconnectTestPrisma } from '../helpers/setup-db'
import { seedOwner } from '../helpers/seed-data'

let prisma: PrismaClient
let repo: PrismaAlbumRepository

beforeEach(async () => {
  prisma = await getTestPrisma()
  await truncateAll(prisma)
  repo = new PrismaAlbumRepository(prisma)
})

afterAll(async () => {
  await disconnectTestPrisma()
})

describe('AlbumRepository.listSummaries', () => {
  it('returns an empty list when no albums exist', async () => {
    const r = await repo.listSummaries()
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.value).toEqual([])
  })

  it('returns summaries sorted by date desc', async () => {
    const ownerId = await seedOwner(prisma)
    await prisma.album.create({
      data: {
        slug: 'a-1', title: {}, period: {}, cover: 'x', date: '2026-01-01',
        season: 'spring', category: 'school', visibility: 'published',
        ownerId, publishedAt: new Date(),
      },
    })
    await prisma.album.create({
      data: {
        slug: 'a-2', title: { ja: '後', id: 'Nanti', en: 'Later' }, period: {}, cover: 'y', date: '2026-06-01',
        season: 'summer', category: 'school', visibility: 'published',
        ownerId, publishedAt: new Date(),
      },
    })
    const r = await repo.listSummaries()
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.value).toHaveLength(2)
      expect(r.value[0]!.slug).toBe('a-2')
      expect(r.value[0]!.title).toBe('Later')
    }
  })
})

describe('AlbumRepository.listAlbums', () => {
  it('paginates with PageResult envelope', async () => {
    const ownerId = await seedOwner(prisma)
    for (let i = 0; i < 5; i++) {
      await prisma.album.create({
        data: {
          slug: `a-${i}`, title: {}, period: {}, cover: 'x', date: `2026-0${i + 1}-01`,
          season: 'spring', category: 'school', visibility: 'published',
          ownerId, publishedAt: new Date(),
        },
      })
    }
    const r = await repo.listAlbums({ page: 0, limit: 2 })
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.value.items).toHaveLength(2)
      expect(r.value.total).toBe(5)
      expect(r.value.page).toBe(0)
      expect(r.value.size).toBe(2)
    }
  })

  it('returns empty page when out of range', async () => {
    const r = await repo.listAlbums({ page: 99, limit: 10 })
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.value.items).toEqual([])
      expect(r.value.total).toBe(0)
    }
  })
})

describe('AlbumRepository.getAlbum', () => {
  it('returns ok(null) for missing slug', async () => {
    const r = await repo.getAlbum('missing')
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.value).toBeNull()
  })

  it('returns the mapped album when present', async () => {
    const ownerId = await seedOwner(prisma)
    await prisma.album.create({
      data: {
        slug: 'hanami-2026',
        title: { ja: '花見', id: 'Hanami', en: 'Hanami' } as object,
        period: { ja: '春', id: 'Musim semi', en: 'Spring' } as object,
        cover: 'x', date: '2026-04-05', season: 'spring', category: 'festival',
        visibility: 'published', ownerId, publishedAt: new Date(),
      },
    })
    const r = await repo.getAlbum('hanami-2026')
    expect(r.ok).toBe(true)
    if (r.ok && r.value) {
      expect(r.value.slug).toBe('hanami-2026')
      expect(r.value.title.en).toBe('Hanami')
    }
  })
})

describe('AlbumRepository.listPhotos', () => {
  it('returns photos for an album sorted by idx', async () => {
    const ownerId = await seedOwner(prisma)
    await prisma.album.create({
      data: {
        slug: 'x', title: {}, period: {}, cover: 'x', date: '2026-04-05',
        season: 'spring', category: 'school', visibility: 'published',
        ownerId,
      },
    })
    await prisma.photo.createMany({
      data: [
        { albumSlug: 'x', idx: 0, src: 'u0', caption: {}, ago: {}, tags: [], likes: 0, orientation: 'landscape', date: '2026-04-05' },
        { albumSlug: 'x', idx: 1, src: 'u1', caption: {}, ago: {}, tags: [], likes: 0, orientation: 'landscape', date: '2026-04-05' },
      ],
    })
    const r = await repo.listPhotos('x')
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.value).toHaveLength(2)
      expect(r.value[0]!.idx).toBe(0)
      expect(r.value[1]!.idx).toBe(1)
    }
  })
})

describe('AlbumRepository.getPhoto', () => {
  it('rejects non-numeric photoId', async () => {
    const r = await repo.getPhoto('x', 'not-a-number')
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error.code).toBe('validation')
  })

  it('returns null for missing (slug, idx)', async () => {
    const r = await repo.getPhoto('x', 999)
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.value).toBeNull()
  })
})

describe('AlbumRepository.listTimelineEntries', () => {
  it('computes tag = album.slug when albumId is set', async () => {
    const ownerId = await seedOwner(prisma)
    await prisma.album.create({
      data: {
        slug: 'hanami-2026', title: {}, period: {}, cover: 'x', date: '2026-04-05',
        season: 'spring', category: 'festival', visibility: 'published', ownerId,
      },
    })
    await prisma.timelineEntry.create({
      data: {
        date: '2026-04-05',
        title: { ja: 'x', id: 'x', en: 'x' } as object,
        description: { ja: 'x', id: 'x', en: 'x' } as object,
        albumId: 'hanami-2026',
        categoryTag: null,
        photo: 'p',
      },
    })
    const r = await repo.listTimelineEntries()
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.value[0]!.tag).toBe('hanami-2026')
  })

  it('falls back to categoryTag when albumId is null', async () => {
    await prisma.timelineEntry.create({
      data: {
        date: '2026-07-07',
        title: { ja: 'x', id: 'x', en: 'x' } as object,
        description: { ja: 'x', id: 'x', en: 'x' } as object,
        albumId: null,
        categoryTag: 'kelas',
        photo: 'p',
      },
    })
    const r = await repo.listTimelineEntries()
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.value[0]!.tag).toBe('kelas')
  })
})

describe('AlbumRepository.createDraft', () => {
  it('returns conflict on duplicate slug', async () => {
    await repo.createDraft(
      {
        slug: 'd-1', title: 't', description: '', date: '2026-01-01', location: '',
        visibility: 'draft', coverMediaId: null, photoIds: [],
      },
      'draft',
    )
    const r2 = await repo.createDraft(
      {
        slug: 'd-1', title: 't', description: '', date: '2026-01-01', location: '',
        visibility: 'draft', coverMediaId: null, photoIds: [],
      },
      'draft',
    )
    expect(r2.ok).toBe(false)
    if (!r2.ok) expect(r2.error.code).toBe('conflict')
  })

  it('persists the draft and returns the mapped row', async () => {
    const r = await repo.createDraft(
      {
        slug: 'd-2', title: 'Title', description: 'd', date: '2026-08-01', location: 'L',
        visibility: 'draft', coverMediaId: 'm-1', photoIds: ['p1', 'p2'],
      },
      'draft',
    )
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.value.slug).toBe('d-2')
      expect(r.value.photoIds).toEqual(['p1', 'p2'])
      expect(typeof r.value.updatedAt).toBe('number')
    }
  })
})

describe('AlbumRepository.updateDraft', () => {
  it('returns not_found when the draft does not exist', async () => {
    const r = await repo.updateDraft('missing', { title: 'new' })
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error.code).toBe('not_found')
  })

  it('updates only the fields provided', async () => {
    await repo.createDraft(
      {
        slug: 'd-3', title: 'T', description: 'D', date: '2026-08-01', location: 'L',
        visibility: 'draft', coverMediaId: null, photoIds: [],
      },
      'draft',
    )
    const r = await repo.updateDraft('d-3', { title: 'Updated' })
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.value.title).toBe('Updated')
      expect(r.value.description).toBe('D')
    }
  })
})

describe('AlbumRepository.deleteDraft', () => {
  it('returns ok(undefined) on success', async () => {
    await repo.createDraft(
      { slug: 'd-4', title: 'T', description: 'D', date: '2026-08-01', location: 'L',
        visibility: 'draft', coverMediaId: null, photoIds: [] },
      'draft',
    )
    const r = await repo.deleteDraft('d-4')
    expect(r.ok).toBe(true)
  })

  it('returns not_found on missing slug', async () => {
    const r = await repo.deleteDraft('missing')
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error.code).toBe('not_found')
  })
})

describe('AlbumRepository.publish', () => {
  it('returns not_found when draft is missing', async () => {
    const r = await repo.publish('missing')
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error.code).toBe('not_found')
  })

  it('flips the draft visibility to published', async () => {
    await repo.createDraft(
      { slug: 'd-5', title: 'T', description: 'D', date: '2026-08-01', location: 'L',
        visibility: 'draft', coverMediaId: null, photoIds: [] },
      'draft',
    )
    const r = await repo.publish('d-5')
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.value.visibility).toBe('published')
  })
})

describe('AlbumRepository.existingSlugs', () => {
  it('returns slugs sorted', async () => {
    const ownerId = await seedOwner(prisma)
    await prisma.album.create({
      data: { slug: 'zebra', title: {}, period: {}, cover: 'x', date: '2026-01-01', season: 'spring', category: 'school', visibility: 'published', ownerId },
    })
    await prisma.album.create({
      data: { slug: 'apple', title: {}, period: {}, cover: 'x', date: '2026-01-02', season: 'spring', category: 'school', visibility: 'published', ownerId },
    })
    const r = await repo.existingSlugs()
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.value).toEqual(['apple', 'zebra'])
  })
})