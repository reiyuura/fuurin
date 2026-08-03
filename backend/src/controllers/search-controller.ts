/**
 * Search controller — GET /search/{albums,photos,members}?q=…
 */

import type { FastifyReply, FastifyRequest } from 'fastify'
import type { SearchService } from '../services/search-service'
import { ApiError } from '../shared/errors'
import { qSchema } from '../schemas/read-schemas'
import { unwrap } from './result-unwrap'

function readQ(query: Record<string, unknown>): string {
  const parsed = qSchema.safeParse(query.q)
  if (!parsed.success) throw new ApiError('validation', 'parameter q wajib diisi.')
  return parsed.data
}

export function createSearchController(service: SearchService) {
  return {
    /** GET /search/albums?q=… */
    async albums(request: FastifyRequest, reply: FastifyReply) {
      const q = readQ((request.query ?? {}) as Record<string, unknown>)
      return reply.send(unwrap(await service.searchAlbums(q)))
    },

    /** GET /search/photos?q=… */
    async photos(request: FastifyRequest, reply: FastifyReply) {
      const q = readQ((request.query ?? {}) as Record<string, unknown>)
      return reply.send(unwrap(await service.searchPhotos(q)))
    },

    /** GET /search/members?q=… */
    async members(request: FastifyRequest, reply: FastifyReply) {
      const q = readQ((request.query ?? {}) as Record<string, unknown>)
      return reply.send(unwrap(await service.searchMembers(q)))
    },
  }
}