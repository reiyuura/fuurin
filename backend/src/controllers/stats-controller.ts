/**
 * StatsController — GET /stats, public read-only.
 */

import type { FastifyReply, FastifyRequest } from 'fastify'
import type { StatsRepository } from '../repositories/stats-repository'
import { ApiError } from '../shared/errors'

export function createStatsController(statsRepo: StatsRepository) {
  return {
    async get(request: FastifyRequest, reply: FastifyReply) {
      const result = await statsRepo.getStats()
      if (!result.ok) throw new ApiError(result.error.code, result.error.message)
      return reply.send(result.value)
    },
  }
}