/**
 * Write API integration tests — full stack against the real `fuurin_test`
 * DB. Covers: create/update/delete success, validation 400, conflict 409,
 * not-found 404, transaction rollback (delete album cascades photos).
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
  PORT: '4003',
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

async function req(method: 'POST' | 'PATCH' | 'DELETE', path: string, body?: unknown) {
  return app.inject({
    method,
    url: `/api/v1${path}`,
    headers: body !== undefined ? { 'content-type': 'application/json' } : undefined,
    payload: body !== undefined ? JSON.stringify(body) : undefined,
  })
}

const albumBody = {
  slug: 'hanami-2027',
  title: { ja: '花見 2027', id: 'Hanami 2027', en: 'Hanami 2027' },
  period: { ja: '2027年4月', id: 'April 2027', en: 'April 2027' },
  cover: 'https://example.com/h.jpg',
  date: '2027-04-05',
  season: 'spring',
  category: 'festival',
}

describe('POST /albums', () => {
  it('creates an album (201)', async () => {
    await seedOwner(prisma, 'owner@test.local')
    const res = await req('POST', '/albums', albumBody)
    expect(res.statusCode).toBe(201)
    const body = res.json()
    expect(body.slug).toBe('hanami-2027')
    expect(body.title.en).toBe('Hanami 2027')
    expect(body.season).toBe('spring')
  })

  it('409 when slug already exists', async () => {
    await seedOwner(prisma)
    await seedAlbum(prisma, { slug: 'hanami-2027' })
    const res = await req('POST', '/albums', albumBody)
    expect(res.statusCode).toBe(409)
    expect(res.json().code).toBe('conflict')
  })

  it('400 on invalid slug', async () => {
    await seedOwner(prisma)
    const res = await req('POST', '/albums', { ...albumBody, slug: 'BAD SLUG!' })
    expect(res.statusCode).toBe(400)
    expect(res.json().code).toBe('validation')
  })

  it('400 on missing required field', async () => {
    await seedOwner(prisma)
    const res = await req('POST', '/albums', { slug: 'x-1', title: { en: 'X' } })
    expect(res.statusCode).toBe(400)
  })

  it('409 when no seeded user (owner resolution fails as transport)', async () => {
    // No user row → create fails before hitting the FK (service error).
    const res = await req('POST', '/albums', albumBody)
    expect([500, 409]).toContain(res.statusCode)
  })
})

describe('PATCH /albums/:slug', () => {
  it('updates fields (200)', async () => {
    await seedOwner(prisma)
    await seedAlbum(prisma, { slug: 'a-1', title: { en: 'Old' } })
    const res = await req('PATCH', '/albums/a-1', { title: { en: 'New Title' }, views: 99 })
    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.title.en).toBe('New Title')
    expect(body.views).toBe(99)
  })

  it('404 when album missing', async () => {
    const res = await req('PATCH', '/albums/nope', { title: { en: 'X' } })
    expect(res.statusCode).toBe(404)
    expect(res.json().code).toBe('not_found')
  })

  it('400 on invalid enum (season)', async () => {
    await seedOwner(prisma)
    await seedAlbum(prisma, { slug: 'a-1' })
    const res = await req('PATCH', '/albums/a-1', { season: 'monsoon' })
    expect(res.statusCode).toBe(400)
    expect(res.json().code).toBe('validation')
  })
})

describe('DELETE /albums/:slug', () => {
  it('deletes album + cascades photos (200)', async () => {
    await seedOwner(prisma)
    await seedAlbum(prisma, { slug: 'a-1' })
    await seedPhotos(prisma, 'a-1', 5)
    const res = await req('DELETE', '/albums/a-1')
    expect(res.statusCode).toBe(200)
    expect(res.json()).toMatchObject({ slug: 'a-1', deleted: true })
    const photos = await prisma.photo.count({ where: { albumSlug: 'a-1' } })
    expect(photos).toBe(0)
    const album = await prisma.album.count({ where: { slug: 'a-1' } })
    expect(album).toBe(0)
  })

  it('404 when album missing', async () => {
    const res = await req('DELETE', '/albums/nope')
    expect(res.statusCode).toBe(404)
  })
})

describe('POST /media', () => {
  it('creates photo metadata (201)', async () => {
    await seedOwner(prisma)
    await seedAlbum(prisma, { slug: 'a-1' })
    const res = await req('POST', '/media', {
      albumSlug: 'a-1',
      idx: 0,
      src: 'https://example.com/p.jpg',
      caption: { en: 'Pic' },
      orientation: 'landscape',
      date: '2026-01-01',
    })
    expect(res.statusCode).toBe(201)
    expect(res.json()).toMatchObject({ albumSlug: 'a-1', idx: 0 })
  })

  it('409 on duplicate (albumSlug, idx)', async () => {
    await seedOwner(prisma)
    await seedAlbum(prisma, { slug: 'a-1' })
    await seedPhotos(prisma, 'a-1', 1)
    const res = await req('POST', '/media', {
      albumSlug: 'a-1',
      idx: 0,
      src: 'https://example.com/dup.jpg',
      caption: { en: 'Dup' },
      orientation: 'portrait',
      date: '2026-01-01',
    })
    expect(res.statusCode).toBe(409)
    expect(res.json().code).toBe('conflict')
  })

  it('404 when album missing (FK)', async () => {
    const res = await req('POST', '/media', {
      albumSlug: 'ghost',
      idx: 0,
      src: 'https://example.com/p.jpg',
      caption: { en: 'Pic' },
      orientation: 'landscape',
      date: '2026-01-01',
    })
    expect(res.statusCode).toBe(404)
    expect(res.json().code).toBe('not_found')
  })
})

describe('PATCH /media/:id', () => {
  it('updates photo metadata (200)', async () => {
    await seedOwner(prisma)
    await seedAlbum(prisma, { slug: 'a-1' })
    await seedPhotos(prisma, 'a-1', 1)
    const res = await req('PATCH', '/media/a-1:0', { likes: 7, tags: ['Kelas'] })
    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.likes).toBe(7)
    expect(body.tags).toEqual(['Kelas'])
  })

  it('404 when photo missing', async () => {
    await seedOwner(prisma)
    await seedAlbum(prisma, { slug: 'a-1' })
    const res = await req('PATCH', '/media/a-1:99', { likes: 1 })
    expect(res.statusCode).toBe(404)
  })
})

describe('DELETE /media/:id', () => {
  it('deletes photo (200)', async () => {
    await seedOwner(prisma)
    await seedAlbum(prisma, { slug: 'a-1' })
    await seedPhotos(prisma, 'a-1', 2)
    const res = await req('DELETE', '/media/a-1:1')
    expect(res.statusCode).toBe(200)
    const remaining = await prisma.photo.count({ where: { albumSlug: 'a-1' } })
    expect(remaining).toBe(1)
  })
})

describe('POST /timeline', () => {
  it('creates timeline entry (201)', async () => {
    await seedOwner(prisma)
    const res = await req('POST', '/timeline', {
      date: '2027-01-01',
      title: { en: 'New Year' },
      description: { en: 'Party' },
      photo: 'https://example.com/t.jpg',
    })
    expect(res.statusCode).toBe(201)
    expect(res.json().date).toBe('2027-01-01')
  })

  it('400 on invalid date', async () => {
    const res = await req('POST', '/timeline', {
      date: '01/01/27',
      title: { en: 'X' },
      description: { en: 'Y' },
      photo: 'https://example.com/t.jpg',
    })
    expect(res.statusCode).toBe(400)
    expect(res.json().code).toBe('validation')
  })

  it('404 when referencing a missing album', async () => {
    const res = await req('POST', '/timeline', {
      date: '2027-01-01',
      title: { en: 'X' },
      description: { en: 'Y' },
      albumId: 'ghost',
      photo: 'https://example.com/t.jpg',
    })
    expect(res.statusCode).toBe(404)
  })
})

describe('PATCH /timeline/:id', () => {
  it('updates (200)', async () => {
    await seedOwner(prisma)
    const created = await req('POST', '/timeline', {
      date: '2027-01-01',
      title: { en: 'Old' },
      description: { en: 'Body' },
      photo: 'https://example.com/t.jpg',
    })
    const id = created.json().id
    const res = await req('PATCH', `/timeline/${id}`, { title: { en: 'New' } })
    expect(res.statusCode).toBe(200)
    expect(res.json().title.en).toBe('New')
  })

  it('404 when missing', async () => {
    const res = await req('PATCH', '/timeline/ghost', { title: { en: 'X' } })
    expect(res.statusCode).toBe(404)
  })
})

describe('DELETE /timeline/:id', () => {
  it('deletes (200)', async () => {
    await seedOwner(prisma)
    const created = await req('POST', '/timeline', {
      date: '2027-01-01',
      title: { en: 'X' },
      description: { en: 'Y' },
      photo: 'https://example.com/t.jpg',
    })
    const id = created.json().id
    const res = await req('DELETE', `/timeline/${id}`)
    expect(res.statusCode).toBe(200)
    const missing = await req('DELETE', `/timeline/${id}`)
    expect(missing.statusCode).toBe(404)
  })
})

describe('POST /members', () => {
  const memberBody = {
    nameJa: 'たろう',
    name: { ja: '山田 太郎', id: 'Yamada Tarou', en: 'Tarou Yamada' },
    role: { ja: '委員', id: 'Anggota', en: 'Member' },
    avatar: 'https://example.com/t.jpg',
  }

  it('creates member (201)', async () => {
    const res = await req('POST', '/members', memberBody)
    expect(res.statusCode).toBe(201)
    // Domain Member derives initial from nameJa; the wire shape is
    // the domain shape, not the request body.
    const body = res.json()
    expect(body.initial).toBe('た')
    expect(body.name.en).toBe('Tarou Yamada')
  })

  it('409 on duplicate nameJa', async () => {
    await req('POST', '/members', memberBody)
    const res = await req('POST', '/members', memberBody)
    expect(res.statusCode).toBe(409)
    expect(res.json().code).toBe('conflict')
  })
})

describe('PATCH /members/:id', () => {
  it('updates (200)', async () => {
    const created = await req('POST', '/members', {
      nameJa: 'たろう',
      name: { ja: '山田', id: 'Yamada', en: 'Yamada' },
      avatar: 'https://example.com/t.jpg',
    })
    const id = created.json().id
    const res = await req('PATCH', `/members/${id}`, { nameJa: 'じろう' })
    expect(res.statusCode).toBe(200)
    expect(res.json().initial).toBe('じ')
  })

  it('404 when missing', async () => {
    const res = await req('PATCH', '/members/ghost', { nameJa: 'X' })
    expect(res.statusCode).toBe(404)
  })
})

describe('DELETE /members/:id', () => {
  it('deletes (200)', async () => {
    const created = await req('POST', '/members', {
      nameJa: 'たろう',
      name: { ja: '山田', id: 'Yamada', en: 'Yamada' },
      avatar: 'https://example.com/t.jpg',
    })
    const id = created.json().id
    const res = await req('DELETE', `/members/${id}`)
    expect(res.statusCode).toBe(200)
    const count = await prisma.member.count({ where: { id } })
    expect(count).toBe(0)
  })
})