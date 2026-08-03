/**
 * Write controller — request parsing + response shaping only.
 * Sprint 20B: reads `request.user` to pass as `actorId` for audit.
 */

import type { FastifyReply, FastifyRequest } from 'fastify'
import type { WriteService } from '../services/write-service'
import type { AuthedRequest } from '../plugins/auth-guard'
import { ApiError } from '../shared/errors'
import { parseOrThrow } from './zod-parse'
import {
  createAlbumSchema,
  updateAlbumSchema,
  createMediaSchema,
  updateMediaSchema,
  createTimelineSchema,
  updateTimelineSchema,
  createMemberSchema,
  updateMemberSchema,
  albumSlugParamSchema,
  mediaIdParamSchema,
  timelineIdParamSchema,
  memberIdParamSchema,
} from '../schemas/write-schemas'

export function createWriteController(service: WriteService) {
  /** Read actor from the authenticated request. */
  function actorId(req: FastifyRequest): string | undefined {
    return (req as AuthedRequest).user?.id
  }

  return {
    /* ── Albums ─────────────────────────────────────────────── */
    async createAlbum(request: FastifyRequest, reply: FastifyReply) {
      const input = parseOrThrow(createAlbumSchema, request.body, 'payload album')
      const result = await service.createAlbum(input, actorId(request))
      if (!result.ok) throw new ApiError(result.error.code, result.error.message)
      return reply.status(201).send(result.value)
    },

    async updateAlbum(request: FastifyRequest, reply: FastifyReply) {
      const { slug } = parseOrThrow(albumSlugParamSchema, request.params, 'parameter slug')
      const patch = parseOrThrow(updateAlbumSchema, request.body, 'payload update album')
      const result = await service.updateAlbum(slug, patch, actorId(request))
      if (!result.ok) throw new ApiError(result.error.code, result.error.message)
      return reply.send(result.value)
    },

    async deleteAlbum(request: FastifyRequest, reply: FastifyReply) {
      const { slug } = parseOrThrow(albumSlugParamSchema, request.params, 'parameter slug')
      const result = await service.deleteAlbum(slug, actorId(request))
      if (!result.ok) throw new ApiError(result.error.code, result.error.message)
      return reply.send({ slug, deleted: true })
    },

    /* ── Media ──────────────────────────────────────────────── */
    async createMedia(request: FastifyRequest, reply: FastifyReply) {
      const input = parseOrThrow(createMediaSchema, request.body, 'payload media')
      const result = await service.createMedia(input, actorId(request))
      if (!result.ok) throw new ApiError(result.error.code, result.error.message)
      return reply.status(201).send(result.value)
    },

    async updateMedia(request: FastifyRequest, reply: FastifyReply) {
      const { id } = parseOrThrow(mediaIdParamSchema, request.params, 'parameter media id')
      const patch = parseOrThrow(updateMediaSchema, request.body, 'payload update media')
      // Path id is "slug:idx" — parse it.
      const colon = id.lastIndexOf(':')
      if (colon < 0) throw new ApiError('validation', 'ID media tidak valid (format slug:idx).')
      const albumSlug = id.slice(0, colon)
      const idx = Number(id.slice(colon + 1))
      if (!Number.isInteger(idx)) throw new ApiError('validation', 'ID media tidak valid (idx bukan angka).')
      const result = await service.updateMedia(albumSlug, idx, patch, actorId(request))
      if (!result.ok) throw new ApiError(result.error.code, result.error.message)
      return reply.send(result.value)
    },

    async deleteMedia(request: FastifyRequest, reply: FastifyReply) {
      const { id } = parseOrThrow(mediaIdParamSchema, request.params, 'parameter media id')
      const colon = id.lastIndexOf(':')
      if (colon < 0) throw new ApiError('validation', 'ID media tidak valid (format slug:idx).')
      const albumSlug = id.slice(0, colon)
      const idx = Number(id.slice(colon + 1))
      if (!Number.isInteger(idx)) throw new ApiError('validation', 'ID media tidak valid (idx bukan angka).')
      const result = await service.deleteMedia(albumSlug, idx, actorId(request))
      if (!result.ok) throw new ApiError(result.error.code, result.error.message)
      return reply.send({ id, deleted: true })
    },

    /* ── Timeline ───────────────────────────────────────────── */
    async createTimeline(request: FastifyRequest, reply: FastifyReply) {
      const input = parseOrThrow(createTimelineSchema, request.body, 'payload timeline')
      const result = await service.createTimeline(input, actorId(request))
      if (!result.ok) throw new ApiError(result.error.code, result.error.message)
      return reply.status(201).send(result.value)
    },

    async updateTimeline(request: FastifyRequest, reply: FastifyReply) {
      const { id } = parseOrThrow(timelineIdParamSchema, request.params, 'parameter timeline id')
      const patch = parseOrThrow(updateTimelineSchema, request.body, 'payload update timeline')
      const result = await service.updateTimeline(id, patch, actorId(request))
      if (!result.ok) throw new ApiError(result.error.code, result.error.message)
      return reply.send(result.value)
    },

    async deleteTimeline(request: FastifyRequest, reply: FastifyReply) {
      const { id } = parseOrThrow(timelineIdParamSchema, request.params, 'parameter timeline id')
      const result = await service.deleteTimeline(id, actorId(request))
      if (!result.ok) throw new ApiError(result.error.code, result.error.message)
      return reply.send({ id, deleted: true })
    },

    /* ── Members ────────────────────────────────────────────── */
    async createMember(request: FastifyRequest, reply: FastifyReply) {
      const input = parseOrThrow(createMemberSchema, request.body, 'payload member')
      const result = await service.createMember(input, actorId(request))
      if (!result.ok) throw new ApiError(result.error.code, result.error.message)
      return reply.status(201).send(result.value)
    },

    async updateMember(request: FastifyRequest, reply: FastifyReply) {
      const { id } = parseOrThrow(memberIdParamSchema, request.params, 'parameter member id')
      const patch = parseOrThrow(updateMemberSchema, request.body, 'payload update member')
      const result = await service.updateMember(id, patch, actorId(request))
      if (!result.ok) throw new ApiError(result.error.code, result.error.message)
      return reply.send(result.value)
    },

    async deleteMember(request: FastifyRequest, reply: FastifyReply) {
      const { id } = parseOrThrow(memberIdParamSchema, request.params, 'parameter member id')
      const result = await service.deleteMember(id, actorId(request))
      if (!result.ok) throw new ApiError(result.error.code, result.error.message)
      return reply.send({ id, deleted: true })
    },
  }
}