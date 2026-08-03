/**
 * Upload routes — POST /uploads (multipart), protected.
 */

import type { FastifyInstance } from 'fastify'
import type { UploadService } from '../services/upload-service'
import { createUploadController } from '../controllers/upload-controller'

export async function registerUploadRoutes(
  app: FastifyInstance,
  uploadService: UploadService,
): Promise<void> {
  const c = createUploadController(uploadService)

  // Protected: only admin/editor can upload files.
  app.post('/uploads', {
    preHandler: [app.requireAuth, app.requireRole('admin', 'editor')],
  }, c.upload)
}