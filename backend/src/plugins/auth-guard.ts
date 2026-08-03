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
import { ApiError } from '../shared/errors'

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

export function configureAuthGuard(app: FastifyInstance, env: Env): void {
  app.decorateRequest('user', null)

  app.decorate('requireAuth', async (request: FastifyRequest) => {
    const header = request.headers.authorization
    if (!header || !header.startsWith('Bearer ')) {
      throw new ApiError('unauthorized', 'Token akses diperlukan.')
    }
    const token = header.slice(7)
    try {
      const claims = verifyAccessToken(env, token)
      const req = request as AuthedRequest
      req.user = {
        id: claims.sub,
        email: '',
        displayName: '',
        role: claims.role,
        avatar: '',
      }
    } catch {
      throw new ApiError('unauthorized', 'Token akses tidak valid atau kedaluwarsa.')
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