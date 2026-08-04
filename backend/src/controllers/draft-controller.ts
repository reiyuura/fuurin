/**
 * Draft controller — parses request + delegates to DraftService.
 */

import type { FastifyReply, FastifyRequest } from 'fastify'
import type { DraftService } from '../services/draft-service'
import type { AuthedRequest } from '../plugins/auth-guard'
import { ApiError } from '../shared/errors'
import { parseOrThrow } from './zod-parse'
import { createDraftSchema, updateDraftSchema, draftSlugParamSchema } from '../schemas/draft-schemas'

export function createDraftController(service: DraftService) {
  function actorId(req: FastifyRequest): string | undefined {
    return (req as AuthedRequest).user?.id
  }

  return {
    async list(_: FastifyRequest, reply: FastifyReply) {
      const result = await service.list()
      if (!result.ok) throw new ApiError(result.error.code, result.error.message)
      return reply.send(result.value)
    },

    async get(request: FastifyRequest, reply: FastifyReply) {
      const { slug } = parseOrThrow(draftSlugParamSchema, request.params, 'slug')
      const result = await service.get(slug)
      if (!result.ok) throw new ApiError(result.error.code, result.error.message)
      if (!result.value) throw new ApiError('not_found', 'Draft tidak ditemukan.')
      return reply.send(result.value)
    },

    async create(request: FastifyRequest, reply: FastifyReply) {
      const input = parseOrThrow(createDraftSchema, request.body, 'payload draft')
      const result = await service.create(input, actorId(request))
      if (!result.ok) throw new ApiError(result.error.code, result.error.message)
      return reply.status(201).send(result.value)
    },

    async update(request: FastifyRequest, reply: FastifyReply) {
      const { slug } = parseOrThrow(draftSlugParamSchema, request.params, 'slug')
      const patch = parseOrThrow(updateDraftSchema, request.body, 'payload update draft')
      const result = await service.update(slug, patch, actorId(request))
      if (!result.ok) throw new ApiError(result.error.code, result.error.message)
      return reply.send(result.value)
    },

    async publish(request: FastifyRequest, reply: FastifyReply) {
      const { slug } = parseOrThrow(draftSlugParamSchema, request.params, 'slug')
      const result = await service.publish(slug, actorId(request))
      if (!result.ok) throw new ApiError(result.error.code, result.error.message)
      return reply.send(result.value)
    },

    async archive(request: FastifyRequest, reply: FastifyReply) {
      const { slug } = parseOrThrow(draftSlugParamSchema, request.params, 'slug')
      const result = await service.archive(slug, actorId(request))
      if (!result.ok) throw new ApiError(result.error.code, result.error.message)
      return reply.send({ ok: true })
    },

    async remove(request: FastifyRequest, reply: FastifyReply) {
      const { slug } = parseOrThrow(draftSlugParamSchema, request.params, 'slug')
      const result = await service.remove(slug, actorId(request))
      if (!result.ok) throw new ApiError(result.error.code, result.error.message)
      return reply.send({ slug, deleted: true })
    },
  }
}