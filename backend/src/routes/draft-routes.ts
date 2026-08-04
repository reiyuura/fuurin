/**
 * Draft routes — CRUD + publish + archive.
 */

import type { FastifyInstance } from 'fastify'
import type { DraftService } from '../services/draft-service'
import { createDraftController } from '../controllers/draft-controller'

export async function registerDraftRoutes(app: FastifyInstance, drafts: DraftService): Promise<void> {
  const c = createDraftController(drafts)
  const editor = [app.requireAuth, app.requireRole('admin', 'editor')]
  const admin = [app.requireAuth, app.requireRole('admin')]

  app.get('/drafts', { preHandler: editor }, c.list)
  app.get('/drafts/:slug', { preHandler: editor }, c.get)
  app.post('/drafts', { preHandler: editor }, c.create)
  app.patch('/drafts/:slug', { preHandler: editor }, c.update)
  app.post('/drafts/:slug/publish', { preHandler: editor }, c.publish)
  app.post('/drafts/:slug/archive', { preHandler: editor }, c.archive)
  app.delete('/drafts/:slug', { preHandler: admin }, c.remove)
}