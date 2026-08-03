/**
 * Album controller — request parsing + response shaping only.
 * Business logic stays in AlbumService.
 */

import type { FastifyReply, FastifyRequest } from 'fastify'
import type { AlbumService } from '../services/album-service'
import { ApiError } from '../shared/errors'
import {
  buildQueryOptions,
  limitSchema,
  pageSchema,
  photoIdxParamSchema,
  slugParamSchema,
  sortSpecSchema,
} from '../schemas/read-schemas'
import { unwrap } from './result-unwrap'
import { parseOrThrow } from './zod-parse'

/** Loose query object → validated pagination/sort + passthrough filters. */
function parseListQuery(query: Record<string, unknown>, defaults: { limit?: number } = {}) {
  const page = pageSchema.safeParse(query.page)
  const limit = limitSchema.safeParse(query.limit)
  const sort = query.sort === undefined ? undefined : sortSpecSchema.safeParse(query.sort)

  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(query)) {
    if (k === 'page' || k === 'limit' || k === 'sort') continue
    out[k] = v
  }

  const errors: string[] = []
  if (!page.success) errors.push('page')
  if (!limit.success) errors.push('limit')
  if (sort && !sort.success) errors.push('sort')
  if (errors.length > 0) {
    throw new ApiError('validation', `parameter tidak valid: ${errors.join(', ')}`)
  }

  return buildQueryOptions(out, {
    page: page.success ? page.data : undefined,
    limit: limit.success ? limit.data : defaults.limit,
  })
}

export function createAlbumController(service: AlbumService) {
  const notFound = (what: string) => new ApiError('not_found', `${what} tidak ditemukan.`)

  return {
    /** GET /albums */
    async list(request: FastifyRequest, reply: FastifyReply) {
      const query = (request.query ?? {}) as Record<string, unknown>
      const opts = parseListQuery(query)
      const result = await service.listAlbums(opts)
      return reply.send(unwrap(result))
    },

    /** GET /albums/summaries */
    async summaries(_request: FastifyRequest, reply: FastifyReply) {
      const result = await service.listSummaries()
      return reply.send(unwrap(result))
    },

    /** GET /albums/:slug */
    async get(request: FastifyRequest, reply: FastifyReply) {
      const { slug } = parseOrThrow(slugParamSchema, request.params)
      const result = await service.getAlbum(slug)
      const album = unwrap(result)
      if (album === null) throw notFound('Album')
      return reply.send(album)
    },

    /** GET /albums/:slug/photos */
    async photos(request: FastifyRequest, reply: FastifyReply) {
      const { slug } = parseOrThrow(slugParamSchema, request.params)
      const query = (request.query ?? {}) as Record<string, unknown>
      const opts = parseListQuery(query)
      const result = await service.listPhotos(slug, opts)
      return reply.send(unwrap(result))
    },

    /** GET /albums/:slug/photos/:idx */
    async photo(request: FastifyRequest, reply: FastifyReply) {
      const { slug, idx } = parseOrThrow(photoIdxParamSchema, request.params)
      const result = await service.getPhoto(slug, idx)
      const photo = unwrap(result)
      if (photo === null) throw notFound('Foto')
      return reply.send(photo)
    },

    /** GET /albums/timeline */
    async timeline(_request: FastifyRequest, reply: FastifyReply) {
      const result = await service.listTimeline()
      return reply.send(unwrap(result))
    },
  }
}