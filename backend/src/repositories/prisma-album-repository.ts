/**
 * PrismaAlbumRepository — Prisma-backed implementation of `AlbumRepository`.
 *
 * Mirrors the Sprint 16 interface method-for-method. **Never throws** —
 * every Prisma call goes through `safe()`/`safeFind()`. **Never returns a
 * Prisma type** — the mapper converts to domain shapes.
 */

import type { PrismaClient } from '@prisma/client'
import type { AlbumRepository } from './album-repository'
import type { Result } from '../shared/result'
import { err, ok } from '../shared/result'
import type {
  Album,
  AlbumDraft,
  AlbumSummary,
  AlbumVisibility,
  Photo,
  TimelineEntry,
} from '../domain/models'
import type { QueryOptions } from '../shared/paging'
import type { PageResult } from '../shared/paging'
import type { Album as AlbumDomain } from '../domain/models'
import { toAlbum, toAlbumDraft, toAlbumSummary, toPhoto, toTimelineEntry } from './mappers/prisma-to-domain'
import { buildOrderBy } from './queries/sort'
import { buildWhere } from './queries/filter'
import { buildPageResult, clampPagination } from './queries/pagination'
import { isPrismaKnownRequestError, safe, safeFind } from './queries/prisma-error'

export class PrismaAlbumRepository implements AlbumRepository {
  constructor(private readonly prisma: PrismaClient) {}

  // ── Read ─────────────────────────────────────────────────────

  async listSummaries(): Promise<Result<AlbumSummary[]>> {
    const rows = await safe(async () =>
      this.prisma.album.findMany({ orderBy: buildOrderBy('album') }),
    )
    if (!rows.ok) return rows
    return ok(rows.value.map(toAlbumSummary))
  }

  async listAlbums(opts?: QueryOptions): Promise<Result<PageResult<AlbumDomain>>> {
    const whereResult = buildWhere<Record<string, unknown>>('album', opts?.filter)
    if (!whereResult.ok) return whereResult
    const { skip, take, page, size } = clampPagination(opts?.page, opts?.limit)
    const orderBy = buildOrderBy('album', opts?.sort)

    const [rowsResult, total] = await Promise.all([
      safe(async () =>
        this.prisma.album.findMany({
          where: whereResult.value,
          orderBy,
          skip,
          take,
        }),
      ),
      safe(async () => this.prisma.album.count({ where: whereResult.value })),
    ])
    if (!rowsResult.ok) return rowsResult
    if (!total.ok) return total
    return ok(buildPageResult(rowsResult.value.map(toAlbum), total.value, page, size))
  }

  async getAlbum(slug: string): Promise<Result<Album | null>> {
    const row = await safeFind(async () =>
      this.prisma.album.findUnique({ where: { slug } }),
    )
    if (!row.ok) return row
    return ok(row.value ? toAlbum(row.value) : null)
  }

  async listPhotos(slug: string, opts?: QueryOptions): Promise<Result<Photo[]>> {
    const whereResult = buildWhere<Record<string, unknown>>('photo', {
      ...(opts?.filter ?? {}),
      album: slug,
    })
    if (!whereResult.ok) return whereResult
    const orderBy = buildOrderBy('photo', opts?.sort)
    const rows = await safe(async () =>
      this.prisma.photo.findMany({
        where: whereResult.value,
        orderBy,
      }),
    )
    if (!rows.ok) return rows
    return ok(rows.value.map(toPhoto))
  }

  async getPhoto(slug: string, photoId: number | string): Promise<Result<Photo | null>> {
    const idx = typeof photoId === 'number' ? photoId : Number(photoId)
    if (!Number.isInteger(idx) || idx < 0) {
      return err('validation', 'photoId tidak valid.', { photoId })
    }
    const row = await safeFind(async () =>
      this.prisma.photo.findUnique({
        where: { albumSlug_idx: { albumSlug: slug, idx } },
      }),
    )
    if (!row.ok) return row
    return ok(row.value ? toPhoto(row.value) : null)
  }

  async listTimelineEntries(): Promise<Result<TimelineEntry[]>> {
    const rows = await safe(async () =>
      this.prisma.timelineEntry.findMany({
        orderBy: buildOrderBy('timeline'),
        include: { album: { select: { slug: true } } },
      }),
    )
    if (!rows.ok) return rows
    // The mapper signature expects `{ album: { slug } | null }`; after
    // include Prisma returns `album: { slug } | null` exactly.
    return ok(
      rows.value.map((r) =>
        toTimelineEntry({ ...r, album: r.album ?? null } as Parameters<typeof toTimelineEntry>[0]),
      ),
    )
  }

  // ── Editor / write ──────────────────────────────────────────

  async existingSlugs(): Promise<Result<string[]>> {
    const rows = await safe(async () =>
      this.prisma.album.findMany({ select: { slug: true }, orderBy: { slug: 'asc' } }),
    )
    if (!rows.ok) return rows
    return ok(rows.value.map((r) => r.slug))
  }

  async getDraft(slug: string): Promise<Result<AlbumDraft | null>> {
    const row = await safeFind(async () =>
      this.prisma.albumDraft.findUnique({ where: { slug } }),
    )
    if (!row.ok) return row
    return ok(row.value ? toAlbumDraft(row.value) : null)
  }

  async createDraft(
    input: Omit<AlbumDraft, 'updatedAt'>,
    visibility: AlbumVisibility,
  ): Promise<Result<AlbumDraft>> {
    const row = await safe(async () =>
      this.prisma.albumDraft.create({
        data: {
          slug: input.slug,
          title: input.title,
          description: input.description,
          date: input.date,
          location: input.location,
          visibility,
          coverMediaId: input.coverMediaId,
          photoIds: input.photoIds,
        },
      }),
    )
    if (!row.ok) return row
    return ok(toAlbumDraft(row.value))
  }

  async updateDraft(
    slug: string,
    patch: Partial<Omit<AlbumDraft, 'slug' | 'updatedAt'>>,
  ): Promise<Result<AlbumDraft>> {
    const row = await safe(async () =>
      this.prisma.albumDraft.update({
        where: { slug },
        data: {
          ...(patch.title !== undefined ? { title: patch.title } : {}),
          ...(patch.description !== undefined ? { description: patch.description } : {}),
          ...(patch.date !== undefined ? { date: patch.date } : {}),
          ...(patch.location !== undefined ? { location: patch.location } : {}),
          ...(patch.visibility !== undefined ? { visibility: patch.visibility } : {}),
          ...(patch.coverMediaId !== undefined ? { coverMediaId: patch.coverMediaId } : {}),
          ...(patch.photoIds !== undefined ? { photoIds: patch.photoIds } : {}),
        },
      }),
    )
    if (!row.ok) return row
    return ok(toAlbumDraft(row.value))
  }

  async deleteDraft(slug: string): Promise<Result<void>> {
    try {
      await this.prisma.albumDraft.delete({ where: { slug } })
      return ok(undefined)
    } catch (e) {
      if (isPrismaKnownRequestError(e) && e.code === 'P2025') {
        return err('not_found', 'Draft tidak ditemukan.', { slug })
      }
      return err('unknown', 'Gagal menghapus draft.', e)
    }
  }

  async publish(slug: string): Promise<Result<AlbumDraft>> {
    const attempt = async (): Promise<Result<AlbumDraft>> => {
      try {
        const draft = await this.prisma.$transaction(
          async (tx) => {
            const current = await tx.albumDraft.findUnique({ where: { slug } })
            if (!current) throw new Error('P2025')
            const updated = await tx.albumDraft.update({
              where: { slug },
              data: { visibility: 'published' },
            })
            // Touch the linked Album row so its updatedAt advances.
            if (current.albumId) {
              await tx.album.update({
                where: { slug: current.albumId },
                data: { publishedAt: new Date() },
              }).catch(() => undefined)
            }
            return updated
          },
          { isolationLevel: 'Serializable' },
        )
        return ok(toAlbumDraft(draft))
      } catch (e) {
        if (e instanceof Error && e.message === 'P2025') {
          return err('not_found', 'Draft tidak ditemukan.', { slug })
        }
        // Re-thrown Prisma errors map to their domain codes.
        return err('conflict', 'Gagal memublikasikan draft.', e)
      }
    }

    const first = await attempt()
    if (first.ok) return first
    // Retry once on conflict (write serialization).
    if (first.error.code === 'conflict') {
      const second = await attempt()
      return second
    }
    return first
  }
}