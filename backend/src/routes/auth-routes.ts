/**
 * Auth routes — login, refresh, logout, users/me.
 *
 * Registration order: `/users/me` before `/auth/*` (no conflict —
 * different prefixes).
 */

import type { FastifyInstance } from 'fastify'
import type { AuthService } from '../services/auth-service'
import type { Env } from '../config/env'
import { createAuthController } from '../controllers/auth-controller'

export async function registerAuthRoutes(
  app: FastifyInstance,
  auth: AuthService,
  env: Env,
): Promise<void> {
  const c = createAuthController(auth, env)

  /* ── Auth ─────────────────────────────────────────────────── */
  app.post('/auth/login', { preHandler: [app.rateLimitAuth] }, c.login)
  app.post('/auth/refresh', { preHandler: [app.rateLimitRefresh] }, c.refresh)
  app.post('/auth/logout', c.logout)

  /* ── Users ────────────────────────────────────────────────── */
  app.get('/users/me', { preHandler: [app.requireAuth] }, c.me)
}