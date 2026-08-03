/**
 * Media controller — parsing + response shaping; logic in MediaService.
 */

import type { FastifyReply, FastifyRequest } from 'fastify'
import type { MediaService } from '../services/media-service'
import { ApiError } from '../shared/errors'
import { buildQueryOptions, mediaIdParamSchema } from '../schemas/read-schemas'
import { unwrap } from './result-unwrap'
import { parseOrThrow } from './zod-parse'

export function createMediaController(service: MediaService) {
  return {
    /** GET /media — bare array; album/tag filters forwarded as query. */
    async list(request: FastifyRequest, reply: FastifyReply) {
      const query = (request.query ?? {}) as Record<string, unknown>
      const opts = buildQueryOptions(query)
      const result = await service.list(opts)
      return reply.send(unwrap(result))
    },

    /** GET /media/:id — 400 on malformed id, 404 when missing. */
    async get(request: FastifyRequest, reply: FastifyReply) {
      const { id } = parseOrThrow(mediaIdParamSchema, request.params)
      const result = await service.get(id)
      if (!result.ok && result.error.code === 'validation') {
        throw new ApiError('validation', result.error.message, { id })
      }
      const media = unwrap(result)
      if (media === null) throw new ApiError('not_found', 'Media tidak ditemukan.')
      return reply.send(media)
    },
  }
}