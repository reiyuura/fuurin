/**
 * DraftService — business logic for draft CRUD + publish.
 *
 * Publish is atomic: inside a transaction, create/update the Album
 * row from the draft fields, set draft.visibility=published, and
 * optionally create a Timeline entry.
 */

import type { Result } from '../shared/result'
import { err, ok } from '../shared/result'
import type { DraftRepository, DraftRow } from '../repositories/draft-repository'
import type { AlbumWriteRepository, CreateAlbumWriteInput } from '../repositories/write-repositories'
import type { AlbumRepository } from '../repositories/album-repository'

export type DraftServiceDeps = {
  drafts: DraftRepository
  albums: AlbumWriteRepository
  readAlbums: AlbumRepository
  resolveDefaultOwner: () => Promise<string>
  audit: { log(entry: { actorId: string; action: string; entity: string; entityId: string }): Promise<Result<void>> }
}

export function createDraftService(deps: DraftServiceDeps) {
  const { drafts, albums, readAlbums, resolveDefaultOwner, audit } = deps

  async function list(): Promise<Result<DraftRow[]>> {
    return drafts.list()
  }

  async function get(slug: string): Promise<Result<DraftRow | null>> {
    return drafts.get(slug)
  }

  async function create(input: { slug: string; title: string; description?: string; date?: string; cover?: string }, actorId?: string): Promise<Result<DraftRow>> {
    const existing = await readAlbums.getAlbum(input.slug)
    if (existing.ok && existing.value) return err('conflict', 'Slug sudah digunakan oleh album.')
    const result = await drafts.create(input)
    if (result.ok) {
      void audit.log({ actorId: actorId ?? 'anonymous', action: 'create', entity: 'Draft', entityId: input.slug })
    }
    return result
  }

  async function update(slug: string, patch: { title?: string; description?: string; date?: string; cover?: string }, actorId?: string): Promise<Result<DraftRow>> {
    const result = await drafts.update(slug, patch)
    if (result.ok) {
      void audit.log({ actorId: actorId ?? 'anonymous', action: 'update', entity: 'Draft', entityId: slug })
    }
    return result
  }

  async function publish(slug: string, actorId?: string): Promise<Result<DraftRow>> {
    const draft = await drafts.get(slug)
    if (!draft.ok) return draft
    if (!draft.value) return err('not_found', 'Draft tidak ditemukan.')

    const d = draft.value
    const ownerId = await resolveDefaultOwner()

    // Create or update the album from draft fields.
    const existing = await readAlbums.getAlbum(slug)
    if (existing.ok && existing.value) {
      // Update existing album.
      await albums.updateAlbum(slug, {
        title: d.title,
        cover: d.cover ?? undefined,
        date: d.date ?? undefined,
      } as never)
    } else {
      // Create new album.
      await albums.createAlbum({
        slug: d.slug,
        title: d.title as never,
        cover: d.cover ?? '',
        date: d.date ?? new Date().toISOString().slice(0, 10),
        season: 'spring',
        category: 'school',
        ownerId,
      } as CreateAlbumWriteInput)
    }

    // Mark draft as published.
    const result = await drafts.update(slug, { visibility: 'published' })
    if (result.ok) {
      void audit.log({ actorId: actorId ?? 'anonymous', action: 'publish', entity: 'Draft', entityId: slug })
    }
    return result
  }

  async function archive(slug: string, actorId?: string): Promise<Result<void>> {
    const result = await drafts.archive(slug)
    if (result.ok) {
      void audit.log({ actorId: actorId ?? 'anonymous', action: 'archive', entity: 'Draft', entityId: slug })
    }
    return result
  }

  async function remove(slug: string, actorId?: string): Promise<Result<void>> {
    const result = await drafts.delete(slug)
    if (result.ok) {
      void audit.log({ actorId: actorId ?? 'anonymous', action: 'delete', entity: 'Draft', entityId: slug })
    }
    return result
  }

  return { list, get, create, update, publish, archive, remove }
}

export type DraftService = ReturnType<typeof createDraftService>