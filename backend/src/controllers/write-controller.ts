/**
 * Write controller — request parsing + response shaping only.
 * Business logic stays in WriteService.
 */

import type { FastifyReply, FastifyRequest } from 'fastify'
import type { WriteService } from '../services/write-service'
import { ApiError } from '../shared/errors'
import { parseOrThrow } from './zod-parse'
import {
  albumSlugParamSchema,
  createAlbumSchema,
  createMediaSchema,
  createMemberSchema,
  createTimelineSchema,
  mediaIdParamSchema,
  memberIdParamSchema,
  timelineIdParamSchema,
  updateAlbumSchema,
  updateMediaSchema,
  updateMemberSchema,
  updateTimelineSchema,
} from '../schemas/write-schemas'

function body<T>(request: FastifyRequest): T {
  return (request.body ?? {}) as T
}

export function createWriteController(service: WriteService) {
  /* ── Album ─────────────────────────────────────────────────── */

  return {
    async createAlbum(request: FastifyRequest, reply: FastifyReply) {
      const input = parseOrThrow(createAlbumSchema, body(request), 'payload album')
      const result = await service.createAlbum(input)
      if (!result.ok) throw mapError(result.error.code, result.error.message)
      return reply.status(201).send(result.value)
    },

    async updateAlbum(request: FastifyRequest, reply: FastifyReply) {
      const { slug } = parseOrThrow(albumSlugParamSchema, request.params)
      const patch = parseOrThrow(updateAlbumSchema, body(request), 'payload album')
      const result = await service.updateAlbum(slug, patch)
      if (!result.ok) throw mapError(result.error.code, result.error.message)
      return reply.send(result.value)
    },

    async deleteAlbum(request: FastifyRequest, reply: FastifyReply) {
      const { slug } = parseOrThrow(albumSlugParamSchema, request.params)
      const result = await service.deleteAlbum(slug)
      if (!result.ok) throw mapError(result.error.code, result.error.message)
      return reply.send({ slug, deleted: true })
    },

    /* ── Media ───────────────────────────────────────────────── */

    async createMedia(request: FastifyRequest, reply: FastifyReply) {
      const input = parseOrThrow(createMediaSchema, body(request), 'payload media')
      const result = await service.createMedia(input)
      if (!result.ok) throw mapError(result.error.code, result.error.message)
      return reply.status(201).send(result.value)
    },

    async updateMedia(request: FastifyRequest, reply: FastifyReply) {
      const { id } = parseOrThrow(mediaIdParamSchema, request.params)
      const parsed = parseMediaId(id)
      if (!parsed) throw new ApiError('validation', 'id media tidak valid.', { id })
      const patch = parseOrThrow(updateMediaSchema, body(request), 'payload media')
      const result = await service.updateMedia(parsed.albumSlug, parsed.idx, patch)
      if (!result.ok) throw mapError(result.error.code, result.error.message)
      return reply.send(result.value)
    },

    async deleteMedia(request: FastifyRequest, reply: FastifyReply) {
      const { id } = parseOrThrow(mediaIdParamSchema, request.params)
      const parsed = parseMediaId(id)
      if (!parsed) throw new ApiError('validation', 'id media tidak valid.', { id })
      const result = await service.deleteMedia(parsed.albumSlug, parsed.idx)
      if (!result.ok) throw mapError(result.error.code, result.error.message)
      return reply.send({ id, deleted: true })
    },

    /* ── Timeline ────────────────────────────────────────────── */

    async createTimeline(request: FastifyRequest, reply: FastifyReply) {
      const input = parseOrThrow(createTimelineSchema, body(request), 'payload timeline')
      const result = await service.createTimeline(input)
      if (!result.ok) throw mapError(result.error.code, result.error.message)
      return reply.status(201).send(result.value)
    },

    async updateTimeline(request: FastifyRequest, reply: FastifyReply) {
      const { id } = parseOrThrow(timelineIdParamSchema, request.params)
      const patch = parseOrThrow(updateTimelineSchema, body(request), 'payload timeline')
      const result = await service.updateTimeline(id, patch)
      if (!result.ok) throw mapError(result.error.code, result.error.message)
      return reply.send(result.value)
    },

    async deleteTimeline(request: FastifyRequest, reply: FastifyReply) {
      const { id } = parseOrThrow(timelineIdParamSchema, request.params)
      const result = await service.deleteTimeline(id)
      if (!result.ok) throw mapError(result.error.code, result.error.message)
      return reply.send({ id, deleted: true })
    },

    /* ── Member ──────────────────────────────────────────────── */

    async createMember(request: FastifyRequest, reply: FastifyReply) {
      const input = parseOrThrow(createMemberSchema, body(request), 'payload member')
      const result = await service.createMember(input)
      if (!result.ok) throw mapError(result.error.code, result.error.message)
      return reply.status(201).send(result.value)
    },

    async updateMember(request: FastifyRequest, reply: FastifyReply) {
      const { id } = parseOrThrow(memberIdParamSchema, request.params)
      const patch = parseOrThrow(updateMemberSchema, body(request), 'payload member')
      const result = await service.updateMember(id, patch)
      if (!result.ok) throw mapError(result.error.code, result.error.message)
      return reply.send(result.value)
    },

    async deleteMember(request: FastifyRequest, reply: FastifyReply) {
      const { id } = parseOrThrow(memberIdParamSchema, request.params)
      const result = await service.deleteMember(id)
      if (!result.ok) throw mapError(result.error.code, result.error.message)
      return reply.send({ id, deleted: true })
    },
  }
}

function parseMediaId(id: string): { albumSlug: string; idx: number } | null {
  const lastColon = id.lastIndexOf(':')
  if (lastColon <= 0 || lastColon === id.length - 1) return null
  const albumSlug = id.slice(0, lastColon)
  const idx = Number(id.slice(lastColon + 1))
  if (!Number.isInteger(idx) || idx < 0) return null
  return { albumSlug, idx }
}

function mapError(code: string, message: string): ApiError {
  return new ApiError(code as ApiError['code'], message)
}