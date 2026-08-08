/**
 * Auth API integration tests — login, refresh, logout, users/me.
 *
 * Uses the real test DB with a seeded user (email: rei@fuurin.id,
 * password: rei12345, role: admin).
 */

import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import type { FastifyInstance } from 'fastify'
import { buildApp } from '../src/app'
import { loadEnvironment } from '../src/config/env'
import { createPrismaRepositories } from '../src/repositories/registry'
import { AuthRepository } from '../src/auth/auth-repository'
import { BcryptPasswordHasher } from '../src/auth/password-hasher'
import { createAuthService } from '../src/services/auth-service'
import { getTestPrisma, truncateAll, disconnectTestPrisma } from './helpers/setup-db'
import type { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const ENV = {
  NODE_ENV: 'test' as const, PORT: '4004', HOST: '127.0.0.1',
  DATABASE_URL: 'postgresql://fuurin:***@127.0.0.1:5432/fuurin_test',
  LOG_LEVEL: 'silent' as const, STORAGE_DRIVER: 'local' as const, STORAGE_LOCAL_ROOT: './storage/uploads',
  API_BASE_PATH: '/api/v1', API_VERSION: 'v1',
  JWT_SECRET: 'test-secret-at-least-32-characters-long-xx',
  JWT_ACCESS_TTL_SEC: 900, JWT_REFRESH_TTL_SEC: 604800,
  JWT_REFRESH_COOKIE: 'fuurin_rt', UPLOAD_MAX_BYTES: 10_000_000,
}

let prisma: PrismaClient
let app: FastifyInstance

beforeAll(async () => {
  prisma = await getTestPrisma()
  const env = loadEnvironment(ENV)
  const repos = createPrismaRepositories(prisma)
  const auth = createAuthService({
    env,
    repo: new AuthRepository(prisma),
    hasher: new BcryptPasswordHasher(),
  })
  const built = await buildApp(env, { logger: false }, { repositories: repos, authService: auth })
  app = built.app
})

beforeEach(async () => {
  await truncateAll(prisma)
  // Seed a user with a known password.
  const passwordHash = await bcrypt.hash('rei12345', 10)
  await prisma.user.create({
    data: {
      email: 'rei@fuurin.id',
      name: 'Rei',
      role: 'admin',
      avatar: 'https://example.com/rei.jpg',
      passwordHash,
    },
  })
})

afterAll(async () => {
  await app.close()
  await disconnectTestPrisma()
})

async function post(path: string, body: unknown) {
  return app.inject({
    method: 'POST',
    url: `/api/v1${path}`,
    headers: { 'content-type': 'application/json' },
    payload: JSON.stringify(body),
  })
}

async function get(path: string, token?: string) {
  const headers: Record<string, string> = {}
  if (token) headers.authorization = `Bearer ${token}`
  return app.inject({ method: 'GET', url: `/api/v1${path}`, headers })
}

describe('POST /auth/login', () => {
  it('returns 200 with access token + user', async () => {
    const res = await post('/auth/login', {
      email: 'rei@fuurin.id',
      password: 'rei12345',
    })
    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.user.email).toBe('rei@fuurin.id')
    expect(body.user.role).toBe('admin')
    expect(typeof body.accessToken).toBe('string')
    expect(body.accessToken.length).toBeGreaterThan(20)
    // Refresh cookie set. (Multiple Set-Cookie headers arrive as an
    // array — join before asserting on contents.)
    const setCookie = res.headers['set-cookie']
    expect(setCookie).toBeDefined()
    const cookieStr = Array.isArray(setCookie) ? setCookie.join('; ') : String(setCookie)
    expect(cookieStr).toContain('fuurin_rt')
    // Session-hint cookie set (non-HttpOnly — the frontend reads it to
    // decide whether a refresh attempt is worthwhile).
    expect(cookieStr).toContain('fuurin_has_session=1')
  })

  it('returns 401 on wrong password', async () => {
    const res = await post('/auth/login', {
      email: 'rei@fuurin.id',
      password: 'wrong',
    })
    expect(res.statusCode).toBe(401)
    expect(res.json().code).toBe('unauthorized')
  })

  it('returns 401 on unknown email', async () => {
    const res = await post('/auth/login', {
      email: 'nobody@example.com',
      password: 'x',
    })
    expect(res.statusCode).toBe(401)
    expect(res.json().code).toBe('unauthorized')
  })

  it('returns 400 on missing fields', async () => {
    const res = await post('/auth/login', { email: 'x' })
    expect(res.statusCode).toBe(400)
    expect(res.json().code).toBe('validation')
  })
})

describe('POST /auth/refresh', () => {
  it('returns a new access token from a valid refresh token', async () => {
    const loginRes = await post('/auth/login', {
      email: 'rei@fuurin.id', password: 'rei12345',
    })
    const rawSetCookie = loginRes.headers['set-cookie']
    const cookieHeader = Array.isArray(rawSetCookie) ? rawSetCookie.join('; ') : String(rawSetCookie)
    const refreshCookie = cookieHeader.match(/fuurin_rt=([^;]+)/)?.[1] ?? ''
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/refresh',
      headers: { cookie: `fuurin_rt=${refreshCookie}` },
    })
    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(typeof body.accessToken).toBe('string')
    expect(body.accessToken.length).toBeGreaterThan(20)
  })

  it('returns 401 on invalid refresh token', async () => {
    const res = await post('/auth/refresh', { refreshToken: 'garbage-token-that-is-long-enough' })
    expect(res.statusCode).toBe(401)
    expect(res.json().code).toBe('unauthorized')
  })

  it('returns 401 when no token provided', async () => {
    const res = await app.inject({
      method: 'POST', url: '/api/v1/auth/refresh',
      headers: { 'content-type': 'application/json' },
      payload: '{}',
    })
    expect(res.statusCode).toBe(401)
  })
})

describe('POST /auth/logout', () => {
  it('clears the refresh cookie and returns ok', async () => {
    const res = await app.inject({
      method: 'POST', url: '/api/v1/auth/logout',
    })
    expect(res.statusCode).toBe(200)
    expect(res.json()).toEqual({ ok: true })
    // Verify both cookies cleared (array when multiple Set-Cookie).
    const setCookie = res.headers['set-cookie']
    if (setCookie) {
      const cookieStr = Array.isArray(setCookie) ? setCookie.join('; ') : String(setCookie)
      expect(cookieStr).toContain('fuurin_rt=;')
      expect(cookieStr).toContain('fuurin_has_session=;')
    }
  })
})

describe('GET /users/me', () => {
  it('returns 200 + user when authenticated', async () => {
    const loginRes = await post('/auth/login', {
      email: 'rei@fuurin.id', password: 'rei12345',
    })
    const token = loginRes.json().accessToken
    const res = await get('/users/me', token)
    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.email).toBe('rei@fuurin.id')
    expect(body.displayName).toBe('Rei')
    expect(body.role).toBe('admin')
  })

  it('returns 401 when no token', async () => {
    const res = await get('/users/me')
    expect(res.statusCode).toBe(401)
    expect(res.json().code).toBe('unauthorized')
  })

  it('returns 401 when token is invalid', async () => {
    const res = await get('/users/me', 'invalid.token.here')
    expect(res.statusCode).toBe(401)
    expect(res.json().code).toBe('unauthorized')
  })
})