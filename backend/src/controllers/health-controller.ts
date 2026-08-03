/**
 * Health controller — thin: builds the health result, returns it.
 * No business logic (parity with the layered architecture: controller
 * delegates to a service).
 */

import type { FastifyRequest, FastifyReply } from 'fastify'
import type { Env } from '../config/env'
import { buildHealth } from '../services/health-service'

export function createHealthController(env: Env, startedAt: number) {
  return {
    handle: (_request: FastifyRequest, reply: FastifyReply) => {
      return reply.send(buildHealth(env, startedAt))
    },
  }
}