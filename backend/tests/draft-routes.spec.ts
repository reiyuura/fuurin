/**
 * Draft routes + refresh-race + reorder-audit integration tests.
 *
 * Added in the 2026-08-07 audit remediation (Phase 5) — these cover
 * behaviors that previously had zero test coverage:
 *  - /drafts CRUD + publish + the auth guard matrix
 *  - refresh-token replay under concurrency (atomic rotation)
 *  - reorderMedia producing an audit row
 */

import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import type { FastifyInstance } from 'fastify'
import { buildApp } from '../src/app'
import { loadEnvironment } from '../src/config/env'
import { createPrismaRepositories } from '../src/repositories/registry'
import { getTestPrisma, truncateAll, disconnectTestPrisma } from './helpers/setup-db'
import type { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import { AuthRepository } from '../src/auth/auth-repository'
import { BcryptPasswordHasher } from '../src/auth/password-hasher'
import { createAuthService } from '../src/services/auth-service'

const ENV = {
  NODE_ENV: 'test' as const, PORT: '4007', HOST: '127.0.0.1',
  DATABASE_URL: 'postgresql://fuurin:***@127.0.0.1:5432/fuurin_test',
  LOG_LEVEL: 'silent' as const, STORAGE_DRIVER: 'local' as const, STORAGE_LOCAL_ROOT: './storage/uploads',
  API_BASE_PATH: '/api/v1', API_VERSION: 'v1',
  JWT_SECRET: 'test-secret-at-least-32-characters-long-xx',
  JWT_ACCESS_TTL_SEC: 900, JWT_REFRESH_TTL_SEC: 604800,
  JWT_REFRESH_COOKIE: 'fuurin_rt', UPLOAD_MAX_BYTES: 10_000_000,
}

let prisma: PrismaClient
let app: FastifyInstance
let adminToken: string
let editorToken: string
let viewerToken: string

async function loginAs(email: string): Promise<string> {
  const r = await app.inject({
    method: 'POST', url: '/api/v1/auth/login',
    headers: { 'content-type': 'application/json' },
    payload: JSON.stringify({ email, password: 'pass' }),
  })
  return r.json().accessToken
}

async function req(
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE',
  path: string,
  body?: unknown,
  token?: string,
) {
  const headers: Record<string, string> = {}
  if (body !== undefined) headers['content-type'] = 'application/json'
  if (token) headers.authorization = `Bearer ${token}`
  return app.inject({
    method, url: `/api/v1${path}`,
    headers,
    payload: body !== undefined ? JSON.stringify(body) : undefined,
  })
}

beforeAll(async () => {
  prisma = await getTestPrisma()
  const env = loadEnvironment(ENV)
  const repos = createPrismaRepositories(prisma)
  const auth = createAuthService({ env, repo: new AuthRepository(prisma), hasher: new BcryptPasswordHasher() })
  const built = await buildApp(env, { logger: false }, { repositories: repos, authService: auth })
  app = built.app
})

beforeEach(async () => {
  await truncateAll(prisma)
  const pw = await bcrypt.hash('pass', 10)
  await prisma.user.create({ data: { email: 'admin@test.local', name: 'Admin', role: 'admin', avatar: '', passwordHash: pw } })
  await prisma.user.create({ data: { email: 'editor@test.local', name: 'Ed', role: 'editor', avatar: '', passwordHash: pw } })
  await prisma.user.create({ data: { email: 'viewer@test.local', name: 'Vu', role: 'viewer', avatar: '', passwordHash: pw } })
  adminToken = await loginAs('admin@test.local')
  editorToken = await loginAs('editor@test.local')
  viewerToken = await loginAs('viewer@test.local')
})

afterAll(async () => {
  await app.close()
  await disconnectTestPrisma()
})

/* ── Draft CRUD + publish ────────────────────────────────────── */

describe('Draft routes', () => {
  const draftBody = { slug: 'd-audit', title: 'Draft Audit', description: 'cover' }

  it('full lifecycle: create → list → get → patch → publish → album visible', async () => {
    const created = await req('POST', '/drafts', draftBody, editorToken)
    expect(created.statusCode).toBe(201)

    const list = await req('GET', '/drafts', undefined, editorToken)
    expect(list.statusCode).toBe(200)
    expect(list.json().some((d: { slug: string }) => d.slug === 'd-audit')).toBe(true)

    const got = await req('GET', '/drafts/d-audit', undefined, editorToken)
    expect(got.statusCode).toBe(200)
    expect(got.json().title).toBe('Draft Audit')

    const patched = await req('PATCH', '/drafts/d-audit', { description: 'updated' }, editorToken)
    expect(patched.statusCode).toBe(200)
    expect(patched.json().description).toBe('updated')

    const pub = await req('POST', '/drafts/d-audit/publish', undefined, editorToken)
    expect(pub.statusCode).toBe(200)
    expect(pub.json().visibility).toBe('published')

    // The published album is visible through the public read API.
    const album = await req('GET', '/albums/d-audit')
    expect(album.statusCode).toBe(200)
    expect(album.json().slug).toBe('d-audit')
  })

  it('create with a slug already used by an album → 409', async () => {
    await req('POST', '/drafts', draftBody, editorToken)
    await req('POST', '/drafts/d-audit/publish', undefined, editorToken)
    const dup = await req('POST', '/drafts', draftBody, editorToken)
    expect(dup.statusCode).toBe(409)
  })

  it('delete is admin-only; editor gets 403', async () => {
    await req('POST', '/drafts', draftBody, adminToken)
    const asEditor = await req('DELETE', '/drafts/d-audit', undefined, editorToken)
    expect(asEditor.statusCode).toBe(403)
    const asAdmin = await req('DELETE', '/drafts/d-audit', undefined, adminToken)
    expect(asAdmin.statusCode).toBe(200)
  })

  it('guard matrix: anonymous → 401, viewer → 403', async () => {
    expect((await req('GET', '/drafts')).statusCode).toBe(401)
    expect((await req('POST', '/drafts', draftBody)).statusCode).toBe(401)
    expect((await req('GET', '/drafts', undefined, viewerToken)).statusCode).toBe(403)
    expect((await req('POST', '/drafts', draftBody, viewerToken)).statusCode).toBe(403)
  })
})

/* ── Refresh replay under concurrency ────────────────────────── */

describe('Refresh rotation — race', () => {
  it('concurrent refreshes with the same token: exactly one wins', async () => {
    const loginR = await app.inject({
      method: 'POST', url: '/api/v1/auth/login',
      headers: { 'content-type': 'application/json' },
      payload: JSON.stringify({ email: 'admin@test.local', password: 'pass' }),
    })
    const rt = (loginR.headers['set-cookie'] as string)?.match(/fuurin_rt=([^;]+)/)?.[1] ?? ''
    expect(rt).not.toBe('')

    // Two concurrent refreshes presenting the SAME refresh token.
    const [a, b] = await Promise.all([
      app.inject({
        method: 'POST', url: '/api/v1/auth/refresh',
        headers: { 'content-type': 'application/json' },
        payload: JSON.stringify({ refreshToken: rt }),
      }),
      app.inject({
        method: 'POST', url: '/api/v1/auth/refresh',
        headers: { 'content-type': 'application/json' },
        payload: JSON.stringify({ refreshToken: rt }),
      }),
    ])

    const codes = [a.statusCode, b.statusCode].sort()
    // Exactly one rotation may succeed; the loser is rejected as a
    // replay (the old session row was already consumed atomically).
    expect(codes).toEqual([200, 401])
  })
})

/* ── Audit: reorder ──────────────────────────────────────────── */

describe('Audit — reorderMedia', () => {
  it('reorder writes an audit row', async () => {
    await req('POST', '/albums', {
      slug: 'reord', title: { en: 'R' }, cover: 'https://x.com/p.jpg',
      date: '2026-01-01', season: 'spring', category: 'school',
    }, adminToken)
    const photo = {
      idx: 0, src: 'https://x.com/1.jpg',
      caption: { en: 'a' }, orientation: 'landscape', date: '2026-01-01',
    }
    const p0 = await req('POST', '/media', { ...photo, albumSlug: 'reord', idx: 0 }, adminToken)
    const p1 = await req('POST', '/media', { ...photo, albumSlug: 'reord', idx: 1 }, adminToken)
    expect(p0.statusCode).toBe(201)
    expect(p1.statusCode).toBe(201)

    const r = await req('PATCH', '/media/reorder', {
      albumSlug: 'reord', orderedIds: ['reord:1', 'reord:0'],
    }, editorToken)
    expect(r.statusCode).toBe(200)

    // Audit logging is fire-and-forget (`void audit.log`) by design —
    // poll until the row lands instead of assuming synchronous writes.
    await expect.poll(
      () => prisma.auditLog.count({
        where: { entity: 'Photo', action: 'update', entityId: 'reord (reorder)' },
      }),
      { timeout: 2_000, interval: 50 },
    ).toBe(1)
  })
})
