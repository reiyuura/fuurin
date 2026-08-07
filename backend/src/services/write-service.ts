/**
 * WriteService — Sprint 19 write-side business logic.
 *
 * Rules:
 *  - All business rules live here (slug pre-check, duplicate member,
 *    duplicate timeline, owner resolution).
 *  - Repositories provide the transaction boundary; the service does
 *    NOT call Prisma.
 *  - Every method returns Result<T>; ApiError mapping happens in the
 *    controller layer.
 */

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
} from '../repositories/write-repositories'
import type { AlbumRepository } from '../repositories/album-repository'
import type { Result } from '../shared/result'
import { err } from '../shared/result'
import type { Album, Member, MediaItem, TimelineEntry } from '../domain/models'

export type WriteServiceDeps = {
  /** Read side — existence pre-checks (slug, album refs). */
  readAlbums: AlbumRepository
  albums: AlbumWriteRepository
  media: MediaWriteRepository
  timeline: TimelineWriteRepository
  members: MemberWriteRepository
  /**
   * Resolve the default owner for album creation (no auth yet).
   * Implemented at the composition root (registry level) so the
   * service never touches Prisma.
   */
  resolveDefaultOwner: () => Promise<string>
  /** Audit log — cross-cutting, best-effort (never blocks the caller). */
  audit: {
    log(entry: {
      actorId: string
      action: 'create' | 'update' | 'delete'
      entity: 'Album' | 'Photo' | 'Timeline' | 'Member'
      entityId: string
      metadata?: Record<string, unknown>
    }): Promise<Result<void>>
  }
}

export function createWriteService(deps: WriteServiceDeps) {
  const { readAlbums, albums, media, timeline, members, resolveDefaultOwner, audit } = deps

  /**
   * Strip undefined values from L10n objects so partial payloads
   * (`{ en: 'x' }`) don't overwrite existing ja/id with undefined on
   * merge — Postgres JSONB + JSON.stringify drop undefined keys anyway,
   * but the in-flight object shape still matters when callers later
   * compare what was sent.
   */
  function stripUndefined<T>(v: T): T {
    if (v === undefined || v === null) return v
    if (typeof v !== 'object') return v
    const out: Record<string, unknown> = {}
    for (const [k, val] of Object.entries(v as Record<string, unknown>)) {
      if (val !== undefined) out[k] = val
    }
    return out as T
  }

  /* ── Album ─────────────────────────────────────────────────── */

  async function createAlbum(
    input: Omit<CreateAlbumWriteInput, 'ownerId'>,
    actorId?: string,
  ): Promise<Result<Album>> {
    const existing = await readAlbums.getAlbum(input.slug)
    if (!existing.ok) return existing
    if (existing.value) {
      return err('conflict', `Album dengan slug "${input.slug}" sudah ada.`, { slug: input.slug })
    }
    let ownerId: string
    try {
      ownerId = await resolveDefaultOwner()
    } catch {
      return err('transport', 'Gagal menentukan pemilik album (seed user tidak ada).')
    }
    const result = await albums.createAlbum({ ...input, title: stripUndefined(input.title), period: stripUndefined(input.period), ownerId })
    if (result.ok) {
      void audit.log({ actorId: actorId ?? 'anonymous', action: 'create', entity: 'Album', entityId: input.slug })
    }
    return result
  }

  async function updateAlbum(slug: string, patch: UpdateAlbumWriteInput, actorId?: string): Promise<Result<Album>> {
    const existing = await readAlbums.getAlbum(slug)
    if (!existing.ok) return existing
    if (!existing.value) return err('not_found', 'Album tidak ditemukan.', { slug })
    const result = await albums.updateAlbum(slug, {
      ...patch,
      ...(patch.title !== undefined ? { title: stripUndefined(patch.title) as never } : {}),
      ...(patch.period !== undefined ? { period: stripUndefined(patch.period) as never } : {}),
    })
    if (result.ok) {
      void audit.log({ actorId: actorId ?? 'anonymous', action: 'update', entity: 'Album', entityId: slug })
    }
    return result
  }

  async function deleteAlbum(slug: string, actorId?: string): Promise<Result<void>> {
    const existing = await readAlbums.getAlbum(slug)
    if (!existing.ok) return existing
    if (!existing.value) return err('not_found', 'Album tidak ditemukan.', { slug })
    const result = await albums.deleteAlbum(slug)
    if (result.ok) {
      void audit.log({ actorId: actorId ?? 'anonymous', action: 'delete', entity: 'Album', entityId: slug })
    }
    return result
  }

  /* ── Media ─────────────────────────────────────────────────── */

  async function createMedia(input: CreateMediaWriteInput, actorId?: string): Promise<Result<MediaItem>> {
    const album = await readAlbums.getAlbum(input.albumSlug)
    if (!album.ok) return album
    if (!album.value) {
      return err('not_found', 'Album tidak ditemukan.', { albumSlug: input.albumSlug })
    }
    const result = await media.createPhoto({
      ...input,
      caption: stripUndefined(input.caption),
      ago: stripUndefined(input.ago ?? {}) as never,
    })
    if (result.ok) {
      void audit.log({ actorId: actorId ?? 'anonymous', action: 'create', entity: 'Photo', entityId: `${input.albumSlug}:${input.idx}` })
    }
    return result
  }

  async function updateMedia(
    albumSlug: string,
    idx: number,
    patch: UpdateMediaWriteInput,
    actorId?: string,
  ): Promise<Result<MediaItem>> {
    const album = await readAlbums.getAlbum(albumSlug)
    if (!album.ok) return album
    if (!album.value) return err('not_found', 'Album tidak ditemukan.', { albumSlug })
    const result = await media.updatePhoto(albumSlug, idx, {
      ...patch,
      ...(patch.caption !== undefined ? { caption: stripUndefined(patch.caption) as never } : {}),
      ...(patch.ago !== undefined ? { ago: stripUndefined(patch.ago) as never } : {}),
    })
    if (result.ok) {
      void audit.log({ actorId: actorId ?? 'anonymous', action: 'update', entity: 'Photo', entityId: `${albumSlug}:${idx}` })
    }
    return result
  }

  async function deleteMedia(albumSlug: string, idx: number, actorId?: string): Promise<Result<void>> {
    const album = await readAlbums.getAlbum(albumSlug)
    if (!album.ok) return album
    if (!album.value) return err('not_found', 'Album tidak ditemukan.', { albumSlug })
    const result = await media.deletePhoto(albumSlug, idx)
    if (result.ok) {
      void audit.log({ actorId: actorId ?? 'anonymous', action: 'delete', entity: 'Photo', entityId: `${albumSlug}:${idx}` })
    }
    return result
  }

  async function bulkDeleteMedia(ids: string[], actorId?: string): Promise<Result<number>> {
    const result = await media.deletePhotos(ids)
    if (result.ok && result.value > 0) {
      void audit.log({ actorId: actorId ?? 'anonymous', action: 'delete', entity: 'Photo', entityId: `${result.value} items`, metadata: { ids } })
    }
    return result
  }

  async function reorderMedia(albumSlug: string, orderedIds: string[], actorId?: string): Promise<Result<void>> {
    const album = await readAlbums.getAlbum(albumSlug)
    if (!album.ok) return album
    if (!album.value) return err('not_found', 'Album tidak ditemukan.', { albumSlug })
    const result = await media.reorderPhotos(albumSlug, orderedIds)
    if (result.ok) {
      void audit.log({ actorId: actorId ?? 'anonymous', action: 'update', entity: 'Photo', entityId: `${albumSlug} (reorder)`, metadata: { orderedIds } })
    }
    return result
  }

  /* ── Timeline ──────────────────────────────────────────────── */

  async function createTimeline(input: CreateTimelineWriteInput, actorId?: string): Promise<Result<TimelineEntry>> {
    if (input.albumId) {
      const album = await readAlbums.getAlbum(input.albumId)
      if (!album.ok) return album
      if (!album.value) {
        return err('not_found', 'Album referensi timeline tidak ditemukan.', { albumId: input.albumId })
      }
    }
    const result = await timeline.createTimeline({
      ...input,
      title: stripUndefined(input.title),
      description: stripUndefined(input.description),
    })
    if (result.ok) {
      void audit.log({ actorId: actorId ?? 'anonymous', action: 'create', entity: 'Timeline', entityId: result.value.id })
    }
    return result
  }

  async function updateTimeline(id: string, patch: UpdateTimelineWriteInput, actorId?: string): Promise<Result<TimelineEntry>> {
    if (patch.albumId) {
      const album = await readAlbums.getAlbum(patch.albumId)
      if (!album.ok) return album
      if (!album.value) {
        return err('not_found', 'Album referensi timeline tidak ditemukan.', { albumId: patch.albumId })
      }
    }
    const result = await timeline.updateTimeline(id, {
      ...patch,
      ...(patch.title !== undefined ? { title: stripUndefined(patch.title) as never } : {}),
      ...(patch.description !== undefined ? { description: stripUndefined(patch.description) as never } : {}),
    })
    if (result.ok) {
      void audit.log({ actorId: actorId ?? 'anonymous', action: 'update', entity: 'Timeline', entityId: id })
    }
    return result
  }

  async function deleteTimeline(id: string, actorId?: string): Promise<Result<void>> {
    const result = await timeline.deleteTimeline(id)
    if (result.ok) {
      void audit.log({ actorId: actorId ?? 'anonymous', action: 'delete', entity: 'Timeline', entityId: id })
    }
    return result
  }

  /* ── Member ────────────────────────────────────────────────── */

  async function createMember(input: CreateMemberWriteInput, actorId?: string): Promise<Result<Member>> {
    const result = await members.createMember({
      ...input,
      name: stripUndefined(input.name),
      role: stripUndefined(input.role ?? {}) as never,
    })
    if (result.ok) {
      void audit.log({ actorId: actorId ?? 'anonymous', action: 'create', entity: 'Member', entityId: result.value.id })
    }
    return result
  }

  async function updateMember(id: string, patch: UpdateMemberWriteInput, actorId?: string): Promise<Result<Member>> {
    const result = await members.updateMember(id, {
      ...patch,
      ...(patch.name !== undefined ? { name: stripUndefined(patch.name) as never } : {}),
      ...(patch.role !== undefined ? { role: stripUndefined(patch.role) as never } : {}),
    })
    if (result.ok) {
      void audit.log({ actorId: actorId ?? 'anonymous', action: 'update', entity: 'Member', entityId: id })
    }
    return result
  }

  async function deleteMember(id: string, actorId?: string): Promise<Result<void>> {
    const result = await members.deleteMember(id)
    if (result.ok) {
      void audit.log({ actorId: actorId ?? 'anonymous', action: 'delete', entity: 'Member', entityId: id })
    }
    return result
  }

  return {
    createAlbum,
    updateAlbum,
    deleteAlbum,
    createMedia,
    updateMedia,
    deleteMedia,
    createTimeline,
    updateTimeline,
    deleteTimeline,
    createMember,
    updateMember,
    deleteMember,
    bulkDeleteMedia,
    reorderMedia,
  }
}

export type WriteService = ReturnType<typeof createWriteService>