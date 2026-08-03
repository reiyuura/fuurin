/**
 * JWT helper — issue/verify access + refresh tokens.
 *
 * - Access token: short-lived, sent as `Authorization: Bearer`.
 * - Refresh token: long-lived, opaque-encrypted JWT, sent as
 *   HTTP-only cookie. Stored client-side so logout can clear it.
 *
 * JWT is used only for *transport* of the session — the server keeps
 * its own `Session` row (tokenHash + expiresAt) so revoking a token
 * is a single DB delete.
 */

import jwt, { type JwtPayload } from 'jsonwebtoken'
import crypto from 'node:crypto'
import type { Env } from '../config/env'

export type TokenKind = 'access' | 'refresh'

export type AccessClaims = JwtPayload & {
  sub: string
  role: 'admin' | 'editor' | 'viewer'
  kind: 'access'
}

export type RefreshClaims = JwtPayload & {
  sub: string
  sid: string
  kind: 'refresh'
}

export type TokenPair = {
  accessToken: string
  accessExpiresAt: number
  refreshToken: string
  refreshExpiresAt: number
  sessionId: string
}

/** Hash a refresh token for at-rest storage (Session.tokenHash). */
export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex')
}

export function issueTokenPair(
  env: Env,
  args: { userId: string; role: 'admin' | 'editor' | 'viewer'; sessionId: string },
): TokenPair {
  const now = Math.floor(Date.now() / 1000)
  const accessTtl = env.JWT_ACCESS_TTL_SEC
  const refreshTtl = env.JWT_REFRESH_TTL_SEC

  const accessToken = jwt.sign(
    { sub: args.userId, role: args.role, kind: 'access' },
    env.JWT_SECRET,
    { expiresIn: accessTtl, algorithm: 'HS256' },
  )
  const refreshToken = jwt.sign(
    { sub: args.userId, sid: args.sessionId, kind: 'refresh' },
    env.JWT_SECRET,
    { expiresIn: refreshTtl, algorithm: 'HS256' },
  )

  return {
    accessToken,
    accessExpiresAt: (now + accessTtl) * 1000,
    refreshToken,
    refreshExpiresAt: (now + refreshTtl) * 1000,
    sessionId: args.sessionId,
  }
}

export function verifyAccessToken(env: Env, token: string): AccessClaims {
  const decoded = jwt.verify(token, env.JWT_SECRET, { algorithms: ['HS256'] })
  if (typeof decoded === 'string') throw new Error('unexpected jwt payload')
  const claims = decoded as JwtPayload & { kind?: string; sub?: string; role?: string }
  if (claims.kind !== 'access' || !claims.sub || !claims.role) {
    throw new Error('invalid token kind or missing claims')
  }
  return claims as AccessClaims
}

export function verifyRefreshToken(env: Env, token: string): RefreshClaims {
  const decoded = jwt.verify(token, env.JWT_SECRET, { algorithms: ['HS256'] })
  if (typeof decoded === 'string') throw new Error('unexpected jwt payload')
  const claims = decoded as JwtPayload & { kind?: string; sub?: string; sid?: string }
  if (claims.kind !== 'refresh' || !claims.sub || !claims.sid) {
    throw new Error('invalid token kind or missing claims')
  }
  return claims as RefreshClaims
}