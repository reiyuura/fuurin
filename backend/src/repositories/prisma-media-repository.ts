/**
 * PrismaMediaRepository — Prisma-backed implementation of `MediaRepository`.
 *
 * Reads from the single `Photo` table (per Sprint 17 Refinement #4).
 * `MediaItem.id` is synthesized by `toMediaItem` via `mediaId(albumSlug, idx)`.
 *
 * Search uses `ILIKE` on the `src` URL — caption L10n search lands in
 * Sprint 20+ once the photo library outgrows the app-layer approach.
 */

import type { PrismaClient } from '@prisma/client'
import type { MediaRepository } from './media-repository'
import type { Result } from '../shared/result'
import { err, ok } from '../shared/result'
import type { MediaItem } from '../domain/models'
import type { QueryOptions } from '../shared/paging'
import { toMediaItem } from './mappers/prisma-to-domain'
import { buildOrderBy } from './queries/sort'
import { buildWhere } from './queries/filter'
import { safe, safeFind } from './queries/prisma-error'

export class PrismaMediaRepository implements MediaRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async list(opts?: QueryOptions): Promise<Result<MediaItem[]>> {
    const whereResult = buildWhere<Record<string, unknown>>('photo', opts?.filter)
    if (!whereResult.ok) return whereResult
    const orderBy = buildOrderBy('photo', opts?.sort)
    const rows = await safe(async () =>
      this.prisma.photo.findMany({ where: whereResult.value, orderBy }),
    )
    if (!rows.ok) return rows
    return ok(rows.value.map(toMediaItem))
  }

  async get(id: string): Promise<Result<MediaItem | null>> {
    const lastColon = id.lastIndexOf(':')
    if (lastColon <= 0 || lastColon === id.length - 1) {
      return err('validation', 'id tidak valid.', { id })
    }
    const albumSlug = id.slice(0, lastColon)
    const idx = Number(id.slice(lastColon + 1))
    if (!Number.isInteger(idx) || idx < 0) {
      return err('validation', 'id tidak valid.', { id })
    }
    const row = await safeFind(async () =>
      this.prisma.photo.findUnique({
        where: { albumSlug_idx: { albumSlug, idx } },
      }),
    )
    if (!row.ok) return row
    return ok(row.value ? toMediaItem(row.value) : null)
  }

  async search(opts: {
    query: string
    filter?: QueryOptions['filter']
    sort?: QueryOptions['sort']
  }): Promise<Result<MediaItem[]>> {
    const whereResult = buildWhere<Record<string, unknown>>('photo', opts.filter ?? {})
    if (!whereResult.ok) return whereResult
    const q = opts.query.trim()
    const searchWhere = q
      ? { ...whereResult.value, src: { contains: q, mode: 'insensitive' as const } }
      : whereResult.value
    const orderBy = buildOrderBy('photo', opts.sort)
    const rows = await safe(async () =>
      this.prisma.photo.findMany({ where: searchWhere, orderBy }),
    )
    if (!rows.ok) return rows
    return ok(rows.value.map(toMediaItem))
  }
}