/**
 * Health controller — thin: delegates to the service. Handles both the
 * plain process probe and the `?check=db` readiness probe.
 */

import type { FastifyReply, FastifyRequest } from 'fastify'
import type { Env } from '../config/env'
import { buildHealth, checkDatabase } from '../services/health-service'

export function createHealthController(env: Env, startedAt: number) {
  return {
    handle: async (request: FastifyRequest, reply: FastifyReply) => {
      const base = buildHealth(env, startedAt)
      const check = request.query && typeof request.query === 'object'
        ? (request.query as Record<string, unknown>).check
        : undefined
      if (check !== 'db') {
        return reply.send(base)
      }
      const db = await checkDatabase()
      const body = { ...base, database: db }
      if (db.status === 'ok') {
        return reply.send(body)
      }
      // 503 with the degraded status — frontend `error-mapper` maps 503 → `transport`.
      return reply.status(503).send({ ...body, status: 'degraded' as const })
    },
  }
}