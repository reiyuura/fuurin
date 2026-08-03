/**
 * PasswordHasher + AuthService unit tests.
 */

import { describe, expect, it, vi } from 'vitest'
import { BcryptPasswordHasher } from '../../src/auth/password-hasher'
import { createAuthService } from '../../src/services/auth-service'
import { ok, err } from '../../src/shared/result'
import type { AuthRepository } from '../../src/auth/auth-repository'

const ENV = {
  NODE_ENV: 'test' as const,
  JWT_SECRET: 'test-secret-at-least-32-characters-long-xx',
  JWT_ACCESS_TTL_SEC: 900,
  JWT_REFRESH_TTL_SEC: 604800,
  JWT_REFRESH_COOKIE: 'fuurin_rt',
}

describe('BcryptPasswordHasher', () => {
  const hasher = new BcryptPasswordHasher()

  it('hash produces a different string than input', async () => {
    const h = await hasher.hash('password123')
    expect(h).not.toBe('password123')
    expect(h.length).toBeGreaterThan(20)
  })

  it('verify returns true for correct password', async () => {
    const h = await hasher.hash('mypass')
    expect(await hasher.verify('mypass', h)).toBe(true)
  })

  it('verify returns false for wrong password', async () => {
    const h = await hasher.hash('correct')
    expect(await hasher.verify('wrong', h)).toBe(false)
  })
})

describe('AuthService', () => {
  function makeRepo(overrides: Partial<AuthRepository> = {}): AuthRepository {
    return {
      findByEmail: vi.fn(async () =>
        ok({
          id: 'u-1', email: 'rei@fuurin.id', name: 'Rei', role: 'admin' as const,
          avatar: 'a.jpg', passwordHash: '$2a$10$hashed',
        }),
      ),
      findById: vi.fn(async () =>
        ok({ id: 'u-1', email: 'rei@fuurin.id', displayName: 'Rei', role: 'admin' as const, avatar: 'a.jpg' }),
      ),
      createSession: vi.fn(async () => ok({ id: 'sess-1' })),
      findSession: vi.fn(async () =>
        ok({ id: 'sess-1', userId: 'u-1', expiresAt: new Date(Date.now() + 86400000) }),
      ),
      deleteSession: vi.fn(async () => ok(undefined)),
      ...overrides,
    } as unknown as AuthRepository
  }

  const hasher: { hash: () => Promise<string>; verify: () => Promise<boolean> } = {
    hash: vi.fn(async () => '$2a$10$hashed'),
    verify: vi.fn(async () => true),
  }

  it('login succeeds with correct password', async () => {
    const svc = createAuthService({ env: ENV as never, repo: makeRepo(), hasher: hasher as never })
    const res = await svc.login({ email: 'rei@fuurin.id', password: 'rei12345' })
    expect(res.ok).toBe(true)
    if (res.ok) {
      expect(res.value.user.email).toBe('rei@fuurin.id')
      expect(res.value.user.role).toBe('admin')
      expect(typeof res.value.accessToken).toBe('string')
      expect(typeof res.value.refreshToken).toBe('string')
    }
  })

  it('login fails when user not found', async () => {
    const svc = createAuthService({
      env: ENV as never,
      repo: makeRepo({ findByEmail: vi.fn(async () => ok(null)) }),
      hasher: hasher as never,
    })
    const res = await svc.login({ email: 'nobody@example.com', password: 'x' })
    expect(res.ok).toBe(false)
    if (!res.ok) expect(res.error.code).toBe('unauthorized')
  })

  it('login fails when password is wrong', async () => {
    const wrongHasher = { hash: vi.fn(async () => 'h'), verify: vi.fn(async () => false) }
    const svc = createAuthService({ env: ENV as never, repo: makeRepo(), hasher: wrongHasher as never })
    const res = await svc.login({ email: 'rei@fuurin.id', password: 'wrong' })
    expect(res.ok).toBe(false)
    if (!res.ok) expect(res.error.code).toBe('unauthorized')
  })

  it('refresh fails on invalid token', async () => {
    const svc = createAuthService({ env: ENV as never, repo: makeRepo(), hasher: hasher as never })
    const res = await svc.refresh('invalid-token-string')
    expect(res.ok).toBe(false)
    if (!res.ok) expect(res.error.code).toBe('unauthorized')
  })

  it('logout is idempotent on invalid token', async () => {
    const svc = createAuthService({ env: ENV as never, repo: makeRepo(), hasher: hasher as never })
    const res = await svc.logout('invalid-token')
    expect(res.ok).toBe(true)
  })

  it('currentUser returns the user when found', async () => {
    const svc = createAuthService({ env: ENV as never, repo: makeRepo(), hasher: hasher as never })
    const res = await svc.currentUser('u-1')
    expect(res.ok).toBe(true)
    if (res.ok && res.value) {
      expect(res.value.email).toBe('rei@fuurin.id')
    }
  })
})