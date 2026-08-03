/**
 * MediaRepository tests — exercises the PrismaMediaRepository against
 * the real test Postgres.
 */

import { afterAll, beforeEach, describe, expect, it } from 'vitest'
import type { PrismaClient } from '@prisma/client'
import { PrismaMediaRepository } from '../../src/repositories/prisma-media-repository'
import { truncateAll, getTestPrisma, disconnectTestPrisma } from '../helpers/setup-db'
import { seedAlbum, seedOwner, seedPhotos } from '../helpers/seed-data'

let prisma: PrismaClient
let repo: PrismaMediaRepository

beforeEach(async () => {
  prisma = await getTestPrisma()
  await truncateAll(prisma)
  repo = new PrismaMediaRepository(prisma)
})

afterAll(async () => {
  await disconnectTestPrisma()
})

describe('MediaRepository.list', () => {
  it('returns all media items mapped to domain shape with synthesized ids', async () => {
    const ownerId = await seedOwner(prisma)
    await seedAlbum(prisma, { slug: 'hanami', ownerId })
    await seedPhotos(prisma, 'hanami', 2)

    const r = await repo.list()
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.value).toHaveLength(2)
      for (const item of r.value) {
        expect(item.id).toBe('hanami:' + item.idx)
        expect(item.src).toContain('https://example.com/photos/hanami/')
      }
    }
  })

  it('returns empty list when no media exists', async () => {
    const r = await repo.list()
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.value).toEqual([])
  })
})

describe('MediaRepository.get', () => {
  it('rejects malformed id', async () => {
    const r = await repo.get('no-colon')
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error.code).toBe('validation')
  })

  it('rejects non-integer idx', async () => {
    const r = await repo.get('album:abc')
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error.code).toBe('validation')
  })

  it('returns null for missing (album, idx)', async () => {
    const r = await repo.get('missing:0')
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.value).toBeNull()
  })

  it('returns the media item when present', async () => {
    const ownerId = await seedOwner(prisma)
    await seedAlbum(prisma, { slug: 'album-a', ownerId })
    await seedPhotos(prisma, 'album-a', 1, 0)

    const r = await repo.get('album-a:0')
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.value?.id).toBe('album-a:0')
      expect(r.value?.src).toContain('photos/album-a/0')
    }
  })
})

describe('MediaRepository.search', () => {
  it('filters by src substring case-insensitively', async () => {
    const ownerId = await seedOwner(prisma)
    await seedAlbum(prisma, { slug: 'a', ownerId })
    await prisma.photo.createMany({
      data: [
        { albumSlug: 'a', idx: 0, src: 'https://x.com/Cat-Photo.jpg', caption: {}, ago: {}, tags: [], likes: 0, orientation: 'landscape', date: '2026-01-01' },
        { albumSlug: 'a', idx: 1, src: 'https://x.com/doggo.jpg', caption: {}, ago: {}, tags: [], likes: 0, orientation: 'landscape', date: '2026-01-01' },
      ],
    })

    const r = await repo.search({ query: 'cat-photo' })
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.value).toHaveLength(1)
      expect(r.value[0]!.src).toContain('Cat-Photo')
    }
  })

  it('applies the filter when query present', async () => {
    const ownerId = await seedOwner(prisma)
    await seedAlbum(prisma, { slug: 'a', ownerId })
    await prisma.photo.createMany({
      data: [
        { albumSlug: 'a', idx: 0, src: 'https://x.com/Cat-Photo.jpg', caption: {}, ago: {}, tags: [], likes: 0, orientation: 'landscape', date: '2026-01-01' },
        { albumSlug: 'a', idx: 1, src: 'https://x.com/doggo.jpg', caption: {}, ago: {}, tags: [], likes: 0, orientation: 'landscape', date: '2026-01-01' },
      ],
    })

    const r = await repo.search({ query: '', filter: { album: 'a' } })
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.value).toHaveLength(2)
  })
})