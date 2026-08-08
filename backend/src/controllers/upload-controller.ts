/**
 * Upload controller — extracts multipart file from request, delegates
 * to UploadService, returns public URL + metadata.
 */

import type { FastifyReply, FastifyRequest } from 'fastify'
import type { UploadService } from '../services/upload-service'
import { ApiError } from '../shared/errors'

export function createUploadController(uploadService: UploadService) {
  return {
    /** POST /uploads — multipart/form-data, single file in field "file". */
    async upload(request: FastifyRequest, reply: FastifyReply) {
      const data = await request.file()
      if (!data) {
        throw new ApiError('validation', 'File tidak ditemukan di field "file".')
      }

      const buf = await data.toBuffer()
      const result = await uploadService.upload({
        filename: data.filename,
        mimeType: data.mimetype,
        data: buf,
      })

      if (!result.ok) {
        throw new ApiError(result.error.code, result.error.message)
      }

      return reply.status(201).send(result.value)
    },

    /**
     * GET /uploads/* — public file serving. Keys are random-prefixed and
     * traversal-proof (storage layer); content is image-only by the
     * upload whitelist + a read-boundary re-check.
     */
    async serve(request: FastifyRequest, reply: FastifyReply) {
      const key = (request.params as Record<string, string>)['*'] ?? ''
      const result = await uploadService.getObject(key)
      if (!result.ok) {
        throw new ApiError(result.error.code, result.error.message)
      }
      const obj = result.value
      return reply
        .header('content-type', obj.contentType ?? 'application/octet-stream')
        .header('content-length', String(obj.sizeBytes))
        // Random-prefixed keys are immutable — cache hard.
        .header('cache-control', 'public, max-age=31536000, immutable')
        .header('x-content-type-options', 'nosniff')
        .send(obj.data)
    },
  }
}