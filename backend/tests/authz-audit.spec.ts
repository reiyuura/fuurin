/**
 * Sprint 20B integration tests — authorization, audit, refresh rotation.
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
  NODE_ENV: 'test' as const, PORT: '4005', HOST: '127.0.0.1',
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

async function req(method: 'POST' | 'PATCH' | 'DELETE', path: string, body?: unknown, token?: string) {
  const headers: Record<string, string> = {}
  if (body !== undefined) headers['content-type'] = 'application/json'
  if (token) headers.authorization = `Bearer ${token}`
  return app.inject({
    method, url: `/api/v1${path}`,
    headers,
    payload: body !== undefined ? JSON.stringify(body) : undefined,
  })
}

const albumBody = { slug: 'x', title: { en: 'X' }, cover: 'https://x.com/p.jpg', date: '2026-01-01', season: 'spring', category: 'school' }

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

/* ── Authorization ───────────────────────────────────────────── */

describe('Authorization — Viewer', () => {
  it('viewer create → 403', async () => {
    const r = await req('POST', '/albums', albumBody, viewerToken)
    expect(r.statusCode).toBe(403)
    expect(r.json().code).toBe('forbidden')
  })
  it('viewer update → 403', async () => {
    await req('POST', '/albums', albumBody, adminToken)
    const r = await req('PATCH', '/albums/x', { title: { en: 'Z' } }, viewerToken)
    expect(r.statusCode).toBe(403)
  })
  it('viewer delete → 403', async () => {
    await req('POST', '/albums', albumBody, adminToken)
    const r = await req('DELETE', '/albums/x', undefined, viewerToken)
    expect(r.statusCode).toBe(403)
  })
})

describe('Authorization — Editor', () => {
  it('editor create → 201', async () => {
    const r = await req('POST', '/albums', albumBody, editorToken)
    expect(r.statusCode).toBe(201)
  })
  it('editor update → 200', async () => {
    await req('POST', '/albums', albumBody, adminToken)
    const r = await req('PATCH', '/albums/x', { title: { en: 'Z' } }, editorToken)
    expect(r.statusCode).toBe(200)
  })
  it('editor delete → 403', async () => {
    await req('POST', '/albums', albumBody, adminToken)
    const r = await req('DELETE', '/albums/x', undefined, editorToken)
    expect(r.statusCode).toBe(403)
  })
})

describe('Authorization — Admin', () => {
  it('admin delete → 200', async () => {
    await req('POST', '/albums', albumBody, adminToken)
    const r = await req('DELETE', '/albums/x', undefined, adminToken)
    expect(r.statusCode).toBe(200)
    expect(r.json().deleted).toBe(true)
  })
})

describe('Authorization — Anonymous', () => {
  it('anonymous create → 401', async () => {
    const r = await req('POST', '/albums', albumBody)
    expect(r.statusCode).toBe(401)
    expect(r.json().code).toBe('unauthorized')
  })
  it('anonymous update → 401', async () => {
    const r = await req('PATCH', '/albums/x', { title: { en: 'Z' } })
    expect(r.statusCode).toBe(401)
  })
  it('anonymous delete → 401', async () => {
    const r = await req('DELETE', '/albums/x')
    expect(r.statusCode).toBe(401)
  })
})

/* ── Audit ───────────────────────────────────────────────────── */

describe('Audit', () => {
  it('audit row after create', async () => {
    await req('POST', '/albums', albumBody, adminToken)
    const rows = await prisma.auditLog.findMany({ where: { entity: 'Album', action: 'create' } })
    expect(rows.length).toBeGreaterThanOrEqual(1)
    expect(rows[0].entityId).toBe('x')
  })

  it('audit row after update', async () => {
    await req('POST', '/albums', albumBody, adminToken)
    await req('PATCH', '/albums/x', { title: { en: 'Updated' } }, adminToken)
    const rows = await prisma.auditLog.findMany({ where: { entity: 'Album', action: 'update' } })
    expect(rows.length).toBeGreaterThanOrEqual(1)
  })

  it('audit row after delete', async () => {
    await req('POST', '/albums', albumBody, adminToken)
    await req('DELETE', '/albums/x', undefined, adminToken)
    const rows = await prisma.auditLog.findMany({ where: { entity: 'Album', action: 'delete' } })
    expect(rows.length).toBeGreaterThanOrEqual(1)
  })

  it('no audit on failed request (duplicate slug → 409)', async () => {
    const before = await prisma.auditLog.count()
    await req('POST', '/albums', albumBody, adminToken)
    await req('POST', '/albums', albumBody, adminToken) // duplicate → 409
    const after = await prisma.auditLog.count()
    expect(after).toBe(before + 1) // only the successful one logged
  })
})

/* ── Refresh rotation ────────────────────────────────────────── */

describe('Refresh rotation', () => {
  it('old refresh token fails after rotation', async () => {
    const loginR = await app.inject({
      method: 'POST', url: '/api/v1/auth/login',
      headers: { 'content-type': 'application/json' },
      payload: JSON.stringify({ email: 'admin@test.local', password: 'pass' }),
    })
    const oldCookie = (loginR.headers['set-cookie'] as string)?.match(/fuurin_rt=([^;]+)/)?.[1] ?? ''

    // First rotation succeeds.
    const rot1 = await app.inject({
      method: 'POST', url: '/api/v1/auth/refresh',
      headers: { cookie: `fuurin_rt=${oldCookie}` },
    })
    expect(rot1.statusCode).toBe(200)

    // Old cookie now invalid (session deleted).
    const rot2 = await app.inject({
      method: 'POST', url: '/api/v1/auth/refresh',
      headers: { cookie: `fuurin_rt=${oldCookie}` },
    })
    expect(rot2.statusCode).toBe(401)
    expect(rot2.json().code).toBe('unauthorized')
  })
})