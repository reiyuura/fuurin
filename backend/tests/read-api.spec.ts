/**
 * READ API integration tests — full stack against the real `fuurin_test`
 * DB: Fastify app + Prisma repositories + services + routes.
 *
 * Covers: status codes, response shape, validation, error mapping,
 * pagination, empty result, not found.
 */

import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import type { FastifyInstance } from 'fastify'
import { buildApp } from '../src/app'
import { loadEnvironment } from '../src/config/env'
import { createPrismaRepositories } from '../src/repositories/registry'
import { getTestPrisma, truncateAll, disconnectTestPrisma } from './helpers/setup-db'
import { seedAlbum, seedOwner, seedPhotos } from './helpers/seed-data'
import type { PrismaClient } from '@prisma/client'

const ENV = {
  NODE_ENV: 'test',
  PORT: '4002',
  HOST: '127.0.0.1',
  DATABASE_URL: 'postgresql://fuurin:***@127.0.0.1:5432/fuurin_test',
  LOG_LEVEL: 'silent',
  STORAGE_DRIVER: 'local',
  STORAGE_LOCAL_ROOT: './storage/uploads',
  API_BASE_PATH: '/api/v1',
  API_VERSION: 'v1',
}

let prisma: PrismaClient
let app: FastifyInstance

beforeAll(async () => {
  prisma = await getTestPrisma()
  const env = loadEnvironment(ENV)
  const repos = createPrismaRepositories(prisma)
  const built = await buildApp(env, { logger: false }, { repositories: repos })
  app = built.app
})

beforeEach(async () => {
  await truncateAll(prisma)
})

afterAll(async () => {
  await app.close()
  await disconnectTestPrisma()
})

async function get(path: string) {
  return app.inject({ method: 'GET', url: `/api/v1${path}` })
}

describe('GET /albums', () => {
  it('returns a bare array of albums, 200', async () => {
    await seedAlbum(prisma, { slug: 'a-1', title: { en: 'One' }, date: '2026-01-01' })
    await seedAlbum(prisma, { slug: 'a-2', title: { en: 'Two' }, date: '2026-02-01' })
    const res = await get('/albums')
    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(Array.isArray(body)).toBe(true)
    expect(body).toHaveLength(2)
    const slugs = body.map((a: { slug: string }) => a.slug)
    expect(slugs).toEqual(expect.arrayContaining(['a-1', 'a-2']))
    expect(body[0]).toMatchObject({ category: 'school', season: 'spring' })
  })

  it('returns an empty array when no albums', async () => {
    const res = await get('/albums')
    expect(res.statusCode).toBe(200)
    expect(res.json()).toEqual([])
  })

  it('paginates with limit/page', async () => {
    await seedAlbum(prisma, { slug: 'a-1', title: { en: 'One' }, date: '2026-01-01' })
    await seedAlbum(prisma, { slug: 'a-2', title: { en: 'Two' }, date: '2026-02-01' })
    const res = await get('/albums?limit=1&page=0')
    expect(res.statusCode).toBe(200)
    expect(res.json()).toHaveLength(1)
  })

  it('rejects an invalid page as validation', async () => {
    const res = await get('/albums?page=abc')
    expect(res.statusCode).toBe(400)
    const body = res.json()
    expect(body.code).toBe('validation')
  })

  it('rejects an invalid sort spec as validation', async () => {
    const res = await get('/albums?sort=nonsense')
    expect(res.statusCode).toBe(400)
    expect(res.json().code).toBe('validation')
  })
})

describe('GET /albums/summaries', () => {
  it('returns summaries sorted by date desc', async () => {
    await seedAlbum(prisma, { slug: 'a-1', title: { en: 'One' }, date: '2026-01-01' })
    await seedAlbum(prisma, { slug: 'a-2', title: { en: 'Two' }, date: '2026-02-01' })
    const res = await get('/albums/summaries')
    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.map((s: { slug: string }) => s.slug)).toEqual(['a-2', 'a-1'])
    expect(body[0]).toMatchObject({
      visibility: 'published',
      coverMediaId: 'a-2:0',
    })
  })
})

describe('GET /albums/:slug', () => {
  it('returns the album when present', async () => {
    await seedAlbum(prisma, { slug: 'hanami', title: { en: 'Hanami' } })
    const res = await get('/albums/hanami')
    expect(res.statusCode).toBe(200)
    expect(res.json().slug).toBe('hanami')
  })

  it('404 with not_found envelope when missing', async () => {
    const res = await get('/albums/nope')
    expect(res.statusCode).toBe(404)
    const body = res.json()
    expect(body.code).toBe('not_found')
    expect(typeof body.message).toBe('string')
  })
})

describe('GET /albums/:slug/photos', () => {
  it('lists photos for an album', async () => {
    await seedAlbum(prisma, { slug: 'a-1' })
    await seedPhotos(prisma, 'a-1', 3)
    const res = await get('/albums/a-1/photos')
    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body).toHaveLength(3)
    expect(body[0]).toMatchObject({ album: 'a-1', idx: 0 })
  })

  it('returns empty array for an album without photos', async () => {
    await seedAlbum(prisma, { slug: 'empty' })
    const res = await get('/albums/empty/photos')
    expect(res.statusCode).toBe(200)
    expect(res.json()).toEqual([])
  })
})

describe('GET /albums/:slug/photos/:idx', () => {
  it('returns a single photo', async () => {
    await seedAlbum(prisma, { slug: 'a-1' })
    await seedPhotos(prisma, 'a-1', 3)
    const res = await get('/albums/a-1/photos/1')
    expect(res.statusCode).toBe(200)
    expect(res.json()).toMatchObject({ album: 'a-1', idx: 1 })
  })

  it('404 when idx out of range', async () => {
    await seedAlbum(prisma, { slug: 'a-1' })
    await seedPhotos(prisma, 'a-1', 1)
    const res = await get('/albums/a-1/photos/9')
    expect(res.statusCode).toBe(404)
    expect(res.json().code).toBe('not_found')
  })

  it('400 when idx is not a number', async () => {
    await seedAlbum(prisma, { slug: 'a-1' })
    const res = await get('/albums/a-1/photos/abc')
    expect(res.statusCode).toBe(400)
    expect(res.json().code).toBe('validation')
  })
})

describe('GET /albums/timeline', () => {
  it('returns timeline entries', async () => {
    await seedOwner(prisma)
    await prisma.timelineEntry.create({
      data: {
        date: '2026-01-01',
        title: { en: 'New Year' } as object,
        description: { en: 'Party' } as object,
        photo: 'https://example.com/t.jpg',
      },
    })
    const res = await get('/albums/timeline')
    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body).toHaveLength(1)
    expect(body[0]).toMatchObject({ date: '2026-01-01', tag: 'kelas' })
  })

  it('returns empty array when no entries', async () => {
    const res = await get('/albums/timeline')
    expect(res.statusCode).toBe(200)
    expect(res.json()).toEqual([])
  })
})

describe('GET /media', () => {
  it('lists media items with synthesized ids', async () => {
    await seedAlbum(prisma, { slug: 'a-1' })
    await seedPhotos(prisma, 'a-1', 2)
    const res = await get('/media')
    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body).toHaveLength(2)
    expect(body[0].id).toBe('a-1:0')
    expect(body[0].albumSlug).toBe('a-1')
  })

  it('filters by album', async () => {
    await seedAlbum(prisma, { slug: 'a-1' })
    await seedAlbum(prisma, { slug: 'a-2' })
    await seedPhotos(prisma, 'a-1', 2)
    await seedPhotos(prisma, 'a-2', 1)
    const res = await get('/media?album=a-2')
    expect(res.statusCode).toBe(200)
    expect(res.json()).toHaveLength(1)
  })

  it('rejects unknown filter keys as validation', async () => {
    const res = await get('/media?evil=1')
    expect(res.statusCode).toBe(400)
    expect(res.json().code).toBe('validation')
  })
})

describe('GET /media/:id', () => {
  it('returns the media item', async () => {
    await seedAlbum(prisma, { slug: 'a-1' })
    await seedPhotos(prisma, 'a-1', 2)
    const res = await get('/media/a-1:1')
    expect(res.statusCode).toBe(200)
    expect(res.json()).toMatchObject({ id: 'a-1:1', albumSlug: 'a-1', idx: 1 })
  })

  it('400 for a malformed id', async () => {
    const res = await get('/media/no-colon')
    expect(res.statusCode).toBe(400)
    expect(res.json().code).toBe('validation')
  })

  it('404 when missing', async () => {
    await seedAlbum(prisma, { slug: 'a-1' })
    const res = await get('/media/a-1:99')
    expect(res.statusCode).toBe(404)
    expect(res.json().code).toBe('not_found')
  })
})

describe('GET /members', () => {
  it('returns members', async () => {
    await prisma.member.create({
      data: {
        nameJa: 'はるか',
        name: { ja: '佐藤 はるか', id: 'Satou Haruka', en: 'Haruka Sato' } as object,
        role: { ja: '学級委員長', id: 'Ketua Kelas', en: 'Class President' } as object,
        avatar: 'https://example.com/m.jpg',
      },
    })
    const res = await get('/members')
    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body).toHaveLength(1)
    expect(body[0]).toMatchObject({ nameJa: '佐藤 はるか', avatar: 'https://example.com/m.jpg' })
  })

  it('returns empty array when none', async () => {
    const res = await get('/members')
    expect(res.statusCode).toBe(200)
    expect(res.json()).toEqual([])
  })
})

describe('GET /search/*', () => {
  it('search albums by title', async () => {
    await seedAlbum(prisma, { slug: 'hanami', title: { en: 'Hanami 2026' } })
    await seedAlbum(prisma, { slug: 'study', title: { en: 'Study Session' } })
    const res = await get('/search/albums?q=hanami')
    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.map((a: { slug: string }) => a.slug)).toEqual(['hanami'])
  })

  it('search photos by caption', async () => {
    await seedAlbum(prisma, { slug: 'a-1' })
    await seedPhotos(prisma, 'a-1', 2)
    const res = await get('/search/photos?q=Caption%201')
    expect(res.statusCode).toBe(200)
    expect(res.json()).toHaveLength(1)
  })

  it('search members by name', async () => {
    await prisma.member.create({
      data: {
        nameJa: 'けんた',
        name: { ja: '鈴木 健太', id: 'Suzuki Kenta', en: 'Kenta Suzuki' } as object,
        role: { ja: '副学級委員長', id: 'Wakil', en: 'Vice' } as object,
        avatar: 'https://example.com/k.jpg',
      },
    })
    const res = await get('/search/members?q=kenta')
    expect(res.statusCode).toBe(200)
    expect(res.json()).toHaveLength(1)
  })

  it('returns empty array when no match', async () => {
    await seedAlbum(prisma, { slug: 'a-1' })
    const res = await get('/search/albums?q=zzz')
    expect(res.statusCode).toBe(200)
    expect(res.json()).toEqual([])
  })

  it('400 when q is missing', async () => {
    const res = await get('/search/albums')
    expect(res.statusCode).toBe(400)
    expect(res.json().code).toBe('validation')
  })
})

describe('404 unknown route', () => {
  it('returns the error envelope', async () => {
    const res = await get('/does-not-exist')
    expect(res.statusCode).toBe(404)
    const body = res.json()
    expect(body.code).toBe('not_found')
  })
})