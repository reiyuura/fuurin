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
  }
}