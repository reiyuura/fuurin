/**
 * Upload routes — POST /uploads (multipart, protected),
 * GET /uploads/* (public file serving).
 */

import type { FastifyInstance } from 'fastify'
import type { UploadService } from '../services/upload-service'
import { createUploadController } from '../controllers/upload-controller'

export async function registerUploadRoutes(
  app: FastifyInstance,
  uploadService: UploadService,
): Promise<void> {
  const c = createUploadController(uploadService)

  // Protected: only admin/editor can upload files. Rate-limited per IP.
  app.post('/uploads', {
    preHandler: [app.rateLimitUpload, app.requireAuth, app.requireRole('admin', 'editor')],
  }, c.upload)

  // Public: serve uploaded files (album photos are public content).
  app.get('/uploads/*', c.serve)
}