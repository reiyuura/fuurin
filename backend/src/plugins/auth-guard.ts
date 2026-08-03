/**
 * Auth guard plugin — decorates Fastify with `request.user` and a
 * `requireAuth` preHandler.
 *
 * Usage in routes:
 *   app.get('/users/me', { preHandler: [app.requireAuth] }, handler)
 *
 * The controller reads `request.user` (typed as SessionUser | null);
 * it never parses JWT itself.
 */

import type { FastifyInstance, FastifyRequest } from 'fastify'
import type { Env } from '../config/env'
import { verifyAccessToken } from '../auth/jwt'
import type { SessionUser } from '../domain/auth'
import { ApiError } from '../shared/errors'

export type AuthedRequest = FastifyRequest & {
  user: SessionUser | null
}

// Fastify type augmentation — declare the instance-level decorator.
declare module 'fastify' {
  interface FastifyInstance {
    requireAuth: (request: FastifyRequest) => Promise<void>
  }
  interface FastifyRequest {
    user: SessionUser | null
  }
}

export function configureAuthGuard(app: FastifyInstance, env: Env): void {
  // Decorate request with `user` (null when unauthenticated).
  app.decorateRequest('user', null)

  // Decorate the instance with `requireAuth` preHandler.
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
}