/**
 * AuthService — login, logout, refresh, currentUser.
 *
 * Business rules:
 *  - login: verify password → issue token pair → persist session.
 *  - refresh: verify JWT → lookup session by tokenHash → issue new
 *    access token (refresh rotation optional; Sprint 20A keeps the
 *    same refresh token until it expires or is revoked).
 *  - logout: delete session row by tokenHash.
 *  - currentUser: lookup user by id.
 *
 * Never calls Prisma or bcrypt directly — depends on AuthRepository
 * and PasswordHasher interfaces.
 */

import type { Env } from '../config/env'
import type { AuthRepository } from '../auth/auth-repository'
import type { PasswordHasher } from '../auth/password-hasher'
import type { SessionUser, LoginResult, RefreshResult } from '../domain/auth'
import { err, ok, type Result } from '../shared/result'
import {
  issueTokenPair,
  verifyRefreshToken,
  hashToken,
} from '../auth/jwt'
import type { LoginInput } from '../schemas/auth-schemas'

export type AuthServiceDeps = {
  env: Env
  repo: AuthRepository
  hasher: PasswordHasher
}

export function createAuthService(deps: AuthServiceDeps) {
  const { env, repo, hasher } = deps

  async function login(input: LoginInput): Promise<Result<LoginResult>> {
    const found = await repo.findByEmail(input.email)
    if (!found.ok) return found
    if (!found.value || !found.value.passwordHash) {
      return err('unauthorized', 'Email atau kata sandi tidak valid.')
    }
    const valid = await hasher.verify(input.password, found.value.passwordHash)
    if (!valid) {
      return err('unauthorized', 'Email atau kata sandi tidak valid.')
    }

    const sessionId = crypto.randomUUID()
    const tokenHash = hashToken(sessionId)
    const expiresAt = new Date(Date.now() + env.JWT_REFRESH_TTL_SEC * 1000)
    const session = await repo.createSession({
      userId: found.value.id,
      tokenHash,
      expiresAt,
    })
    if (!session.ok) return session

    // The JWT carries the *raw* sessionId so refresh can hash it
    // and look up the session row by the same hash.
    const pair = issueTokenPair(env, {
      userId: found.value.id,
      role: found.value.role,
      sessionId,
    })

    const user: SessionUser = {
      id: found.value.id,
      email: found.value.email,
      displayName: found.value.name,
      role: found.value.role,
      avatar: found.value.avatar,
    }

    return ok({
      user,
      accessToken: pair.accessToken,
      accessExpiresAt: pair.accessExpiresAt,
      refreshToken: pair.refreshToken,
      refreshExpiresAt: pair.refreshExpiresAt,
    })
  }

  async function refresh(refreshToken: string): Promise<Result<RefreshResult>> {
    let claims
    try {
      claims = verifyRefreshToken(env, refreshToken)
    } catch {
      return err('unauthorized', 'Refresh token tidak valid atau kedaluwarsa.')
    }

    const tokenHash = hashToken(claims.sid)
    const session = await repo.findSession(tokenHash)
    if (!session.ok) return session
    if (!session.value || session.value.expiresAt < new Date()) {
      return err('unauthorized', 'Sesi tidak ditemukan atau telah berakhir.')
    }

    const user = await repo.findById(claims.sub)
    if (!user.ok) return user
    if (!user.value) return err('unauthorized', 'Pengguna tidak ditemukan.')

    const pair = issueTokenPair(env, {
      userId: user.value.id,
      role: user.value.role,
      sessionId: session.value.id,
    })

    return ok({
      accessToken: pair.accessToken,
      accessExpiresAt: pair.accessExpiresAt,
      refreshToken: pair.refreshToken,
      refreshExpiresAt: pair.refreshExpiresAt,
    })
  }

  async function logout(refreshToken: string): Promise<Result<void>> {
    let claims
    try {
      claims = verifyRefreshToken(env, refreshToken)
    } catch {
      // Idempotent — invalid token is treated as already logged out.
      return ok(undefined)
    }
    const tokenHash = hashToken(claims.sid)
    return repo.deleteSession(tokenHash)
  }

  async function currentUser(userId: string): Promise<Result<SessionUser | null>> {
    return repo.findById(userId)
  }

  return { login, refresh, logout, currentUser }
}

export type AuthService = ReturnType<typeof createAuthService>