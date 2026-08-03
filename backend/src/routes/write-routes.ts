/**
 * Write routes — mounts all Sprint 19 WRITE endpoints under the API
 * base path. Static segments registered before param routes.
 */

import type { FastifyInstance } from 'fastify'
import type { WriteService } from '../services/write-service'
import { createWriteController } from '../controllers/write-controller'

export async function registerWriteRoutes(app: FastifyInstance, write: WriteService): Promise<void> {
  const c = createWriteController(write)

  /* ── Albums ───────────────────────────────────────────────── */
  app.post('/albums', c.createAlbum)
  app.patch('/albums/:slug', c.updateAlbum)
  app.delete('/albums/:slug', c.deleteAlbum)

  /* ── Media ────────────────────────────────────────────────── */
  app.post('/media', c.createMedia)
  app.patch('/media/:id', c.updateMedia)
  app.delete('/media/:id', c.deleteMedia)

  /* ── Timeline ─────────────────────────────────────────────── */
  app.post('/timeline', c.createTimeline)
  app.patch('/timeline/:id', c.updateTimeline)
  app.delete('/timeline/:id', c.deleteTimeline)

  /* ── Members ──────────────────────────────────────────────── */
  app.post('/members', c.createMember)
  app.patch('/members/:id', c.updateMember)
  app.delete('/members/:id', c.deleteMember)
}