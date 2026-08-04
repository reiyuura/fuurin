/**
 * Stats routes — public GET /stats.
 */

import type { FastifyInstance } from 'fastify'
import { StatsRepository } from '../repositories/stats-repository'
import { createStatsController } from '../controllers/stats-controller'
import { getPrisma } from '../database/prisma'

export async function registerStatsRoutes(app: FastifyInstance): Promise<void> {
  const repo = new StatsRepository(getPrisma())
  const c = createStatsController(repo)
  app.get('/stats', c.get)
}