/**
 * Write routes — mounts all Sprint 19 WRITE endpoints protected by
 * Sprint 20B authorization.
 *
 * Permission matrix:
 *   Create/Update → requireAuth + requireRole('admin','editor')
 *   Delete        → requireAuth + requireRole('admin')
 */

import type { FastifyInstance } from 'fastify'
import type { WriteService } from '../services/write-service'
import { createWriteController } from '../controllers/write-controller'

export async function registerWriteRoutes(app: FastifyInstance, write: WriteService): Promise<void> {
  const c = createWriteController(write)
  const editor = [app.requireAuth, app.requireRole('admin', 'editor')]
  const admin = [app.requireAuth, app.requireRole('admin')]

  /* ── Albums ───────────────────────────────────────────────── */
  app.post('/albums',    { preHandler: editor },  c.createAlbum)
  app.patch('/albums/:slug', { preHandler: editor },  c.updateAlbum)
  app.delete('/albums/:slug', { preHandler: admin },   c.deleteAlbum)

  /* ── Media ────────────────────────────────────────────────── */
  app.post('/media',     { preHandler: editor },  c.createMedia)
  app.patch('/media/:id',{ preHandler: editor },  c.updateMedia)
  app.delete('/media/:id',{ preHandler: admin },   c.deleteMedia)

  /* Bulk operations */
  app.delete('/media/bulk',{ preHandler: admin },   c.bulkDeleteMedia)
  app.patch('/media/reorder',{ preHandler: editor }, c.reorderMedia)

  /* ── Timeline ─────────────────────────────────────────────── */
  app.post('/timeline',      { preHandler: editor },  c.createTimeline)
  app.patch('/timeline/:id', { preHandler: editor },  c.updateTimeline)
  app.delete('/timeline/:id', { preHandler: admin },   c.deleteTimeline)

  /* ── Members ──────────────────────────────────────────────── */
  app.post('/members',      { preHandler: editor },  c.createMember)
  app.patch('/members/:id', { preHandler: editor },  c.updateMember)
  app.delete('/members/:id', { preHandler: admin },   c.deleteMember)
}