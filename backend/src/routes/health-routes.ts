import type { FastifyInstance } from 'fastify'
import type { Env } from '../config/env'
import { createHealthController } from '../controllers/health-controller'

/**
 * Health routes — mounted at `/api/v1/healthz` (no auth).
 */

export async function registerHealthRoutes(app: FastifyInstance, env: Env, startedAt: number): Promise<void> {
  const health = createHealthController(env, startedAt)
  app.get('/healthz', health.handle)
}