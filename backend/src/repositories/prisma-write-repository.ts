/**
 * PrismaWriteRepository — Sprint 19 write implementations.
 *
 * Rules honored:
 *  - Every mutation goes through `prisma.$transaction` when it touches
 *    more than one entity (album delete cascades photos, timeline album
 *    link touch). Single-row ops use one transaction anyway so partial
 *    writes are impossible (Sprint 19 transaction requirement).
 *  - Never throws a raw Prisma error out of the repository — every
 *    failure maps to a domain `err(...)`. Unique violations (P2002) →
 *    `conflict`; missing rows (P2025) → `not_found`.
 *  - Never returns Prisma types — mappers convert to domain shapes.
 */

import type { PrismaClient, Prisma, AlbumCategory, Season } from '@prisma/client'
import type {
  AlbumWriteRepository,
  MediaWriteRepository,
  TimelineWriteRepository,
  MemberWriteRepository,
  CreateAlbumWriteInput,
  UpdateAlbumWriteInput,
  CreateMediaWriteInput,
  UpdateMediaWriteInput,
  CreateTimelineWriteInput,
  UpdateTimelineWriteInput,
  CreateMemberWriteInput,
  UpdateMemberWriteInput,
} from './write-repositories'
import type { Result } from '../shared/result'

/** Internal marker — thrown inside createMember's transaction to abort
 *  on a duplicate nameJa (mapped to a conflict Result at the boundary). */
class DuplicateMemberNameError extends Error {
  constructor() {
    super('duplicate member nameJa')
    this.name = 'DuplicateMemberNameError'
  }
}

/** Internal marker — thrown inside reorderPhotos' transaction when an
 *  ordered id matches no row (mapped to not_found at the boundary). */
class PhotoNotFoundError extends Error {
  constructor() {
    super('photo not found during reorder')
    this.name = 'PhotoNotFoundError'
  }
}
import { err, ok } from '../shared/result'
import type { Album, Member, MediaItem, TimelineEntry } from '../domain/models'
import { toAlbum, toMember, toMediaItem, toTimelineEntry } from './mappers/prisma-to-domain'
import { isPrismaKnownRequestError } from './queries/prisma-error'

export class PrismaWriteRepository
  implements AlbumWriteRepository, MediaWriteRepository, TimelineWriteRepository, MemberWriteRepository
{
  constructor(private readonly prisma: PrismaClient) {}

  /* ── Album ─────────────────────────────────────────────────── */

  async createAlbum(input: CreateAlbumWriteInput): Promise<Result<Album>> {
    try {
      const row = await this.prisma.$transaction((tx) =>
        tx.album.create({
          data: {
            slug: input.slug,
            title: input.title as Prisma.InputJsonValue,
            period: (input.period ?? { ja: '', id: '', en: '' }) as Prisma.InputJsonValue,
            cover: input.cover,
            date: input.date,
            season: input.season as Season,
            category: input.category as AlbumCategory,
            visibility: input.visibility ?? 'published',
            count: input.count ?? 0,
            views: input.views ?? 0,
            ownerId: input.ownerId,
            publishedAt: input.visibility === undefined || input.visibility === 'published' ? new Date() : null,
          },
        }),
      )
      return ok(toAlbum(row))
    } catch (e) {
      return mapWriteError(e, 'Album')
    }
  }

  async updateAlbum(slug: string, patch: UpdateAlbumWriteInput): Promise<Result<Album>> {
    try {
      const row = await this.prisma.$transaction((tx) =>
        tx.album.update({
          where: { slug },
          data: {
            ...(patch.title !== undefined ? { title: patch.title as Prisma.InputJsonValue } : {}),
            ...(patch.period !== undefined ? { period: patch.period as Prisma.InputJsonValue } : {}),
            ...(patch.cover !== undefined ? { cover: patch.cover } : {}),
            ...(patch.date !== undefined ? { date: patch.date } : {}),
            ...(patch.season !== undefined ? { season: patch.season as Season } : {}),
            ...(patch.category !== undefined ? { category: patch.category as AlbumCategory } : {}),
            ...(patch.visibility !== undefined
              ? { visibility: patch.visibility, publishedAt: patch.visibility === 'published' ? new Date() : undefined }
              : {}),
            ...(patch.count !== undefined ? { count: patch.count } : {}),
            ...(patch.views !== undefined ? { views: patch.views } : {}),
          },
        }),
      )
      return ok(toAlbum(row))
    } catch (e) {
      return mapWriteError(e, 'Album')
    }
  }

  async deleteAlbum(slug: string): Promise<Result<void>> {
    try {
      // Transaction: delete photos (cascade) + timeline links + album row.
      await this.prisma.$transaction(async (tx) => {
        await tx.photo.deleteMany({ where: { albumSlug: slug } })
        await tx.albumDraft.deleteMany({ where: { albumId: slug } })
        await tx.timelineEntry.updateMany({
          where: { albumId: slug },
          data: { albumId: null },
        })
        await tx.album.delete({ where: { slug } })
      })
      return ok(undefined)
    } catch (e) {
      return mapWriteError(e, 'Album')
    }
  }

  /* ── Sprint 23.5: atomic publish ───────────────────────────── */

  async publishDraft(draft: {
    slug: string; title: string; description?: string; date?: string; cover?: string
    ownerId: string
  }): Promise<Result<Album>> {
    try {
      const album = await this.prisma.$transaction(async (tx) => {
        const row = await tx.album.upsert({
          where: { slug: draft.slug },
          create: {
            slug: draft.slug,
            title: draft.title as never,
            period: '',
            count: 0,
            views: 0,
            cover: draft.cover ?? '',
            date: draft.date ?? new Date().toISOString().slice(0, 10),
            season: 'spring',
            category: 'school',
            ownerId: draft.ownerId,
          },
          update: {
            title: draft.title as never,
            ...(draft.cover !== undefined ? { cover: draft.cover } : {}),
            ...(draft.date !== undefined ? { date: draft.date } : {}),
          },
        })
        await tx.albumDraft.update({
          where: { slug: draft.slug },
          data: { visibility: 'published', albumId: draft.slug },
        })
        return row
      })
      return ok(toAlbum(album))
    } catch (e) {
      return mapWriteError(e, 'Album')
    }
  }

  /* ── Media / Photo ─────────────────────────────────────────── */

  /** Keep Album.count in sync with the real photo rows (same tx). */
  private async syncAlbumCount(tx: Prisma.TransactionClient, albumSlug: string): Promise<void> {
    const count = await tx.photo.count({ where: { albumSlug } })
    await tx.album.update({ where: { slug: albumSlug }, data: { count } })
  }

  async createPhoto(input: CreateMediaWriteInput): Promise<Result<MediaItem>> {
    try {
      const row = await this.prisma.$transaction(async (tx) => {
        const created = await tx.photo.create({
          data: {
            albumSlug: input.albumSlug,
            idx: input.idx,
            src: input.src,
            caption: input.caption as Prisma.InputJsonValue,
            ago: (input.ago ?? { ja: '', id: '', en: '' }) as Prisma.InputJsonValue,
            tags: input.tags ?? [],
            likes: input.likes ?? 0,
            orientation: input.orientation,
            date: input.date,
          },
        })
        await this.syncAlbumCount(tx, input.albumSlug)
        return created
      })
      return ok(toMediaItem(row))
    } catch (e) {
      // FK violation (album missing) → P2003.
      return mapWriteError(e, 'Photo', { fkAsConflict: true })
    }
  }

  async updatePhoto(albumSlug: string, idx: number, patch: UpdateMediaWriteInput): Promise<Result<MediaItem>> {
    try {
      const row = await this.prisma.$transaction((tx) =>
        tx.photo.update({
          where: { albumSlug_idx: { albumSlug, idx } },
          data: {
            ...(patch.src !== undefined ? { src: patch.src } : {}),
            ...(patch.caption !== undefined ? { caption: patch.caption as Prisma.InputJsonValue } : {}),
            ...(patch.ago !== undefined ? { ago: patch.ago as Prisma.InputJsonValue } : {}),
            ...(patch.tags !== undefined ? { tags: patch.tags } : {}),
            ...(patch.likes !== undefined ? { likes: patch.likes } : {}),
            ...(patch.orientation !== undefined ? { orientation: patch.orientation } : {}),
            ...(patch.date !== undefined ? { date: patch.date } : {}),
          },
        }),
      )
      return ok(toMediaItem(row))
    } catch (e) {
      return mapWriteError(e, 'Photo')
    }
  }

  async deletePhoto(albumSlug: string, idx: number): Promise<Result<void>> {
    try {
      await this.prisma.$transaction(async (tx) => {
        await tx.photo.delete({ where: { albumSlug_idx: { albumSlug, idx } } })
        await this.syncAlbumCount(tx, albumSlug)
      })
      return ok(undefined)
    } catch (e) {
      return mapWriteError(e, 'Photo')
    }
  }

  /* ── Sprint 22: bulk operations ────────────────────────────── */

  async deletePhotos(ids: string[]): Promise<Result<number>> {
    try {
      let count = 0
      await this.prisma.$transaction(async (tx) => {
        const touchedAlbums = new Set<string>()
        for (const id of ids) {
          const colon = id.lastIndexOf(':')
          if (colon < 0) continue
          const albumSlug = id.slice(0, colon)
          const idx = Number(id.slice(colon + 1))
          if (!Number.isInteger(idx)) continue
          await tx.photo.delete({ where: { albumSlug_idx: { albumSlug, idx } } })
          touchedAlbums.add(albumSlug)
          count++
        }
        for (const albumSlug of touchedAlbums) {
          await this.syncAlbumCount(tx, albumSlug)
        }
      })
      return ok(count)
    } catch (e) {
      return mapWriteError(e, 'Photo')
    }
  }

  async reorderPhotos(albumSlug: string, orderedIds: string[]): Promise<Result<void>> {
    try {
      await this.prisma.$transaction(async (tx) => {
        // Domain id is `slug:idx`. Resolve each to its STABLE row id up
        // front — idx values change mid-reorder, so we can't re-match
        // by the composite key after updates start.
        const rows: Array<{ rowId: string; finalIdx: number }> = []
        for (const [i, id] of orderedIds.entries()) {
          const colon = id.lastIndexOf(':')
          const idx = colon >= 0 ? Number(id.slice(colon + 1)) : NaN
          // findFirst takes plain field filters (the albumSlug_idx
          // compound form is only valid on findUnique/update).
          const where =
            colon >= 0 && Number.isInteger(idx)
              ? { albumSlug: id.slice(0, colon), idx }
              : { id } // fallback: raw Prisma cuid
          const row = await tx.photo.findFirst({ where: where as never, select: { id: true } })
          if (!row) throw new PhotoNotFoundError()
          rows.push({ rowId: row.id, finalIdx: i })
        }
        // Two-phase reindex: park every photo at a temporary negative
        // idx so @@unique(albumSlug, idx) can't collide when positions
        // swap (e.g. [0,1] → [1,0]), then assign the final positions.
        for (const [i, r] of rows.entries()) {
          await tx.photo.update({ where: { id: r.rowId }, data: { idx: -(i + 1) } })
        }
        for (const r of rows) {
          await tx.photo.update({ where: { id: r.rowId }, data: { idx: r.finalIdx } })
        }
      })
      return ok(undefined)
    } catch (e) {
      if (e instanceof PhotoNotFoundError) {
        return err('not_found', 'Foto tidak ditemukan saat mengubah urutan.', { albumSlug })
      }
      return mapWriteError(e, 'Photo')
    }
  }

  /* ── Timeline ──────────────────────────────────────────────── */

  async createTimeline(input: CreateTimelineWriteInput): Promise<Result<TimelineEntry>> {
    try {
      const row = await this.prisma.$transaction((tx) =>
        tx.timelineEntry.create({
          data: {
            date: input.date,
            title: input.title as Prisma.InputJsonValue,
            description: input.description as Prisma.InputJsonValue,
            albumId: input.albumId ?? null,
            categoryTag: input.categoryTag ?? null,
            photo: input.photo,
          },
          include: { album: { select: { slug: true } } },
        }),
      )
      return ok(toTimelineEntry({ ...row, album: row.album ?? null } as Parameters<typeof toTimelineEntry>[0]))
    } catch (e) {
      return mapWriteError(e, 'Timeline', { fkAsConflict: true })
    }
  }

  async updateTimeline(id: string, patch: UpdateTimelineWriteInput): Promise<Result<TimelineEntry>> {
    try {
      const row = await this.prisma.$transaction((tx) =>
        tx.timelineEntry.update({
          where: { id },
          data: {
            ...(patch.date !== undefined ? { date: patch.date } : {}),
            ...(patch.title !== undefined ? { title: patch.title as Prisma.InputJsonValue } : {}),
            ...(patch.description !== undefined ? { description: patch.description as Prisma.InputJsonValue } : {}),
            ...(patch.albumId !== undefined ? { albumId: patch.albumId } : {}),
            ...(patch.categoryTag !== undefined ? { categoryTag: patch.categoryTag } : {}),
            ...(patch.photo !== undefined ? { photo: patch.photo } : {}),
          },
          include: { album: { select: { slug: true } } },
        }),
      )
      return ok(toTimelineEntry({ ...row, album: row.album ?? null } as Parameters<typeof toTimelineEntry>[0]))
    } catch (e) {
      return mapWriteError(e, 'Timeline', { fkAsConflict: true })
    }
  }

  async deleteTimeline(id: string): Promise<Result<void>> {
    try {
      await this.prisma.$transaction((tx) => tx.timelineEntry.delete({ where: { id } }))
      return ok(undefined)
    } catch (e) {
      return mapWriteError(e, 'Timeline')
    }
  }

  /* ── Member ────────────────────────────────────────────────── */

  async createMember(input: CreateMemberWriteInput): Promise<Result<Member>> {
    try {
      // Duplicate member check: same nameJa → conflict. The friendly
      // pre-check AND the create run in ONE transaction, and the
      // Member.nameJa UNIQUE constraint (migration 20260807) is the
      // hard guard — a concurrent create that slips past the pre-check
      // surfaces as P2002 → conflict via mapWriteError.
      const row = await this.prisma.$transaction(async (tx) => {
        const dup = await tx.member.findFirst({
          where: { nameJa: input.nameJa },
        })
        if (dup) throw new DuplicateMemberNameError()
        return tx.member.create({
          data: {
            nameJa: input.nameJa,
            name: input.name as Prisma.InputJsonValue,
            role: (input.role ?? { ja: '', id: '', en: '' }) as Prisma.InputJsonValue,
            avatar: input.avatar,
          },
        })
      })
      return ok(toMember(row))
    } catch (e) {
      if (e instanceof DuplicateMemberNameError) {
        return err('conflict', 'Member dengan nama yang sama sudah ada.', { nameJa: input.nameJa })
      }
      return mapWriteError(e, 'Member')
    }
  }

  async updateMember(id: string, patch: UpdateMemberWriteInput): Promise<Result<Member>> {
    try {
      const row = await this.prisma.$transaction((tx) =>
        tx.member.update({
          where: { id },
          data: {
            ...(patch.nameJa !== undefined ? { nameJa: patch.nameJa } : {}),
            ...(patch.name !== undefined ? { name: patch.name as Prisma.InputJsonValue } : {}),
            ...(patch.role !== undefined ? { role: patch.role as Prisma.InputJsonValue } : {}),
            ...(patch.avatar !== undefined ? { avatar: patch.avatar } : {}),
          },
        }),
      )
      return ok(toMember(row))
    } catch (e) {
      return mapWriteError(e, 'Member')
    }
  }

  async deleteMember(id: string): Promise<Result<void>> {
    try {
      await this.prisma.$transaction((tx) => tx.member.delete({ where: { id } }))
      return ok(undefined)
    } catch (e) {
      return mapWriteError(e, 'Member')
    }
  }
}

/* ── Error mapping helper ────────────────────────────────────── */

function mapWriteError(
  e: unknown,
  entity: string,
  opts: { fkAsConflict?: boolean } = {},
): Result<never> {
  if (isPrismaKnownRequestError(e)) {
    // P2002 — unique constraint (slug, albumSlug_idx, email…).
    if (e.code === 'P2002') {
      return err('conflict', `${entity} sudah ada (duplikat).`, e)
    }
    // P2003 — FK violation (album referenced by photo/timeline, missing owner).
    if (e.code === 'P2003') {
      return opts.fkAsConflict
        ? err('conflict', `Referensi ${entity} tidak valid atau sudah dipakai.`, e)
        : err('not_found', `${entity} tidak ditemukan.`, e)
    }
    // P2025 — row missing (update/delete on absent key).
    if (e.code === 'P2025') {
      return err('not_found', `${entity} tidak ditemukan.`, e)
    }
    return err('unknown', `Gagal memproses ${entity}.`, e)
  }
  return err('unknown', `Gagal memproses ${entity}.`, e)
}