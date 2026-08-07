/**
 * Auth guard plugin — decorates Fastify with `request.user` and
 * `requireAuth` / `requireRole` preHandler helpers.
 *
 * Usage in routes:
 *   app.get('/users/me', { preHandler: [app.requireAuth] }, handler)
 *   app.post('/albums', { preHandler: [app.requireAuth, app.requireRole('admin','editor')] }, handler)
 *   app.delete('/albums/:slug', { preHandler: [app.requireAuth, app.requireRole('admin')] }, handler)
 *
 * The controller reads `request.user` (typed as SessionUser | null);
 * it never parses JWT itself or checks roles manually.
 */

import type { FastifyInstance, FastifyRequest } from 'fastify'
import type { Env } from '../config/env'
import { verifyAccessToken } from '../auth/jwt'
import type { SessionUser, UserRole } from '../domain/auth'
import type { Result } from '../shared/result'
import { ApiError } from '../shared/errors'

/**
 * Looks up the CURRENT user row. Injected so `requireAuth` can reject
 * tokens whose user was deleted/demoted after issuance (JWT claims are
 * otherwise trusted until expiry — up to JWT_ACCESS_TTL_SEC).
 */
export type UserLookup = (userId: string) => Promise<Result<SessionUser | null>>

export type AuthedRequest = FastifyRequest & {
  user: SessionUser | null
}

// Fastify type augmentation.
declare module 'fastify' {
  interface FastifyInstance {
    requireAuth: (request: FastifyRequest) => Promise<void>
    requireRole: (...roles: UserRole[]) => (request: FastifyRequest) => Promise<void>
  }
  interface FastifyRequest {
    user: SessionUser | null
  }
}

export function configureAuthGuard(
  app: FastifyInstance,
  env: Env,
  lookupUser?: UserLookup,
): void {
  app.decorateRequest('user', null)

  app.decorate('requireAuth', async (request: FastifyRequest) => {
    const header = request.headers.authorization
    if (!header || !header.startsWith('Bearer ')) {
      throw new ApiError('unauthorized', 'Token akses diperlukan.')
    }
    const token = header.slice(7)
    let claims
    try {
      claims = verifyAccessToken(env, token)
    } catch {
      throw new ApiError('unauthorized', 'Token akses tidak valid atau kedaluwarsa.')
    }

    const req = request as AuthedRequest

    if (lookupUser) {
      // DB check: the user must still exist, and the CURRENT role from
      // the database wins over the (possibly stale) JWT role claim.
      const found = await lookupUser(claims.sub)
      if (!found.ok) {
        throw new ApiError('unknown', 'Gagal memverifikasi sesi pengguna.')
      }
      if (!found.value) {
        throw new ApiError('unauthorized', 'Akun tidak ditemukan atau sudah dinonaktifkan.')
      }
      req.user = found.value
      return
    }

    // No lookup wired (unit tests): fall back to trusting token claims.
    req.user = {
      id: claims.sub,
      email: '',
      displayName: '',
      role: claims.role,
      avatar: '',
    }
  })

  app.decorate('requireRole', (...roles: UserRole[]) => {
    return async (request: FastifyRequest) => {
      const req = request as AuthedRequest
      if (!req.user || !roles.includes(req.user.role)) {
        throw new ApiError('forbidden', 'Anda tidak memiliki izin untuk akses ini.')
      }
    }
  })
}