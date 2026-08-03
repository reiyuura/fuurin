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
import { err, ok } from '../shared/result'
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
}

export function createWriteService(deps: WriteServiceDeps) {
  const { readAlbums, albums, media, timeline, members, resolveDefaultOwner } = deps

  /**
   * Strip undefined values from L10n objects so partial payloads
   * (`{ en: 'x' }`) don't overwrite existing ja/id with undefined on
   * merge — Postgres JSONB + JSON.stringify drop undefined keys anyway,
   * but the in-flight object shape still matters when callers later
   * compare what was sent.
   */
  function stripUndefined(v: unknown): unknown {
    if (v === undefined || v === null) return v
    if (typeof v !== 'object') return v
    const out: Record<string, unknown> = {}
    for (const [k, val] of Object.entries(v as Record<string, unknown>)) {
      if (val !== undefined) out[k] = val
    }
    return out
  }

  /* ── Album ─────────────────────────────────────────────────── */

  async function createAlbum(input: Omit<CreateAlbumWriteInput, 'ownerId'>): Promise<Result<Album>> {
    // Slug uniqueness — application pre-check + DB unique constraint.
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
    return albums.createAlbum({ ...input, title: stripUndefined(input.title), period: stripUndefined(input.period), ownerId })
  }

  async function updateAlbum(slug: string, patch: UpdateAlbumWriteInput): Promise<Result<Album>> {
    const existing = await readAlbums.getAlbum(slug)
    if (!existing.ok) return existing
    if (!existing.value) return err('not_found', 'Album tidak ditemukan.', { slug })
    return albums.updateAlbum(slug, {
      ...patch,
      ...(patch.title !== undefined ? { title: stripUndefined(patch.title) as never } : {}),
      ...(patch.period !== undefined ? { period: stripUndefined(patch.period) as never } : {}),
    })
  }

  async function deleteAlbum(slug: string): Promise<Result<void>> {
    const existing = await readAlbums.getAlbum(slug)
    if (!existing.ok) return existing
    if (!existing.value) return err('not_found', 'Album tidak ditemukan.', { slug })
    return albums.deleteAlbum(slug)
  }

  /* ── Media ─────────────────────────────────────────────────── */

  async function createMedia(input: CreateMediaWriteInput): Promise<Result<MediaItem>> {
    // Media requires an existing album — FK layer last, pre-check first.
    const album = await readAlbums.getAlbum(input.albumSlug)
    if (!album.ok) return album
    if (!album.value) {
      return err('not_found', 'Album tidak ditemukan.', { albumSlug: input.albumSlug })
    }
    return media.createPhoto({
      ...input,
      caption: stripUndefined(input.caption),
      ago: stripUndefined(input.ago ?? {}) as never,
    })
  }

  async function updateMedia(
    albumSlug: string,
    idx: number,
    patch: UpdateMediaWriteInput,
  ): Promise<Result<MediaItem>> {
    const album = await readAlbums.getAlbum(albumSlug)
    if (!album.ok) return album
    if (!album.value) return err('not_found', 'Album tidak ditemukan.', { albumSlug })
    return media.updatePhoto(albumSlug, idx, {
      ...patch,
      ...(patch.caption !== undefined ? { caption: stripUndefined(patch.caption) as never } : {}),
      ...(patch.ago !== undefined ? { ago: stripUndefined(patch.ago) as never } : {}),
    })
  }

  async function deleteMedia(albumSlug: string, idx: number): Promise<Result<void>> {
    const album = await readAlbums.getAlbum(albumSlug)
    if (!album.ok) return album
    if (!album.value) return err('not_found', 'Album tidak ditemukan.', { albumSlug })
    return media.deletePhoto(albumSlug, idx)
  }

  /* ── Timeline ──────────────────────────────────────────────── */

  async function createTimeline(input: CreateTimelineWriteInput): Promise<Result<TimelineEntry>> {
    if (input.albumId) {
      const album = await readAlbums.getAlbum(input.albumId)
      if (!album.ok) return album
      if (!album.value) {
        return err('not_found', 'Album referensi timeline tidak ditemukan.', { albumId: input.albumId })
      }
    }
    return timeline.createTimeline({
      ...input,
      title: stripUndefined(input.title),
      description: stripUndefined(input.description),
    })
  }

  async function updateTimeline(id: string, patch: UpdateTimelineWriteInput): Promise<Result<TimelineEntry>> {
    if (patch.albumId) {
      const album = await readAlbums.getAlbum(patch.albumId)
      if (!album.ok) return album
      if (!album.value) {
        return err('not_found', 'Album referensi timeline tidak ditemukan.', { albumId: patch.albumId })
      }
    }
    return timeline.updateTimeline(id, {
      ...patch,
      ...(patch.title !== undefined ? { title: stripUndefined(patch.title) as never } : {}),
      ...(patch.description !== undefined ? { description: stripUndefined(patch.description) as never } : {}),
    })
  }

  async function deleteTimeline(id: string): Promise<Result<void>> {
    return timeline.deleteTimeline(id)
  }

  /* ── Member ────────────────────────────────────────────────── */

  async function createMember(input: CreateMemberWriteInput): Promise<Result<Member>> {
    return members.createMember({
      ...input,
      name: stripUndefined(input.name),
      role: stripUndefined(input.role ?? {}) as never,
    })
  }

  async function updateMember(id: string, patch: UpdateMemberWriteInput): Promise<Result<Member>> {
    return members.updateMember(id, {
      ...patch,
      ...(patch.name !== undefined ? { name: stripUndefined(patch.name) as never } : {}),
      ...(patch.role !== undefined ? { role: stripUndefined(patch.role) as never } : {}),
    })
  }

  async function deleteMember(id: string): Promise<Result<void>> {
    return members.deleteMember(id)
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
  }
}

export type WriteService = ReturnType<typeof createWriteService>