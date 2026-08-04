/**
 * DraftRepository — domain interface for album drafts.
 */

import type { PrismaClient } from '@prisma/client'
import { ok, type Result } from '../shared/result'
import { safe } from '../repositories/queries/prisma-error'

export type DraftRow = {
  slug: string
  title: string
  description: string | null
  date: string | null
  visibility: 'draft' | 'published'
  cover: string | null
  albumId: string | null
  updatedAt: string
  createdAt: string
}

export interface DraftRepository {
  list(): Promise<Result<DraftRow[]>>
  get(slug: string): Promise<Result<DraftRow | null>>
  create(input: { slug: string; title: string; description?: string; date?: string; cover?: string }): Promise<Result<DraftRow>>
  update(slug: string, patch: Partial<{ title: string; slug: string; description: string; date: string; cover: string; visibility: 'draft' | 'published' }>): Promise<Result<DraftRow>>
  /** Archive = soft-delete (sets deletedAt). */
  archive(slug: string): Promise<Result<void>>
  /** Hard-delete (admin). */
  delete(slug: string): Promise<Result<void>>
}

export class PrismaDraftRepository implements DraftRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async list(): Promise<Result<DraftRow[]>> {
    const r = await safe(() =>
      this.prisma.albumDraft.findMany({ where: { deletedAt: null }, orderBy: { updatedAt: 'desc' } }),
    )
    if (!r.ok) return r
    return ok(r.value.map(toDraftRow))
  }

  async get(slug: string): Promise<Result<DraftRow | null>> {
    const r = await safe(() =>
      this.prisma.albumDraft.findUnique({ where: { slug, deletedAt: null } }),
    )
    if (!r.ok) return r
    return ok(r.value ? toDraftRow(r.value) : null)
  }

  async create(input: { slug: string; title: string; description?: string; date?: string; cover?: string }): Promise<Result<DraftRow>> {
    const r = await safe(() =>
      this.prisma.albumDraft.create({
        data: {
          slug: input.slug,
          title: input.title,
          description: input.description ?? '',
          date: input.date ?? new Date().toISOString().slice(0, 10),
          coverMediaId: input.cover ?? null,
          visibility: 'draft',
          photoIds: [],
          location: '',
        },
      }),
    )
    if (!r.ok) return r
    return ok(toDraftRow(r.value))
  }

  async update(slug: string, patch: Partial<{ title: string; slug: string; description: string; date: string; cover: string; visibility: 'draft' | 'published' | 'archived' }>): Promise<Result<DraftRow>> {
    const data: Record<string, unknown> = {}
    if (patch.title !== undefined) data.title = patch.title
    if (patch.description !== undefined) data.description = patch.description
    if (patch.date !== undefined) data.date = patch.date
    if (patch.cover !== undefined) data.coverMediaId = patch.cover
    if (patch.visibility !== undefined) data.visibility = patch.visibility
    if (patch.slug !== undefined) data.slug = patch.slug

    const r = await safe(() =>
      this.prisma.albumDraft.update({ where: { slug }, data: data as never }),
    )
    if (!r.ok) return r
    return ok(toDraftRow(r.value))
  }

  async delete(slug: string): Promise<Result<void>> {
    const r = await safe(() =>
      this.prisma.albumDraft.delete({ where: { slug } }),
    )
    if (!r.ok) return r
    return ok(undefined)
  }

  async archive(slug: string): Promise<Result<void>> {
    const r = await safe(() =>
      this.prisma.albumDraft.update({ where: { slug }, data: { deletedAt: new Date() } }),
    )
    if (!r.ok) return r
    return ok(undefined)
  }
}

function toDraftRow(r: { slug: string; title: string; description: string; date: string; visibility: string; coverMediaId: string | null; albumId: string | null; updatedAt: Date; createdAt: Date }): DraftRow {
  return {
    slug: r.slug,
    title: r.title,
    description: r.description || null,
    date: r.date || null,
    visibility: (r.visibility as DraftRow['visibility']) || 'draft',
    cover: r.coverMediaId || null,
    albumId: r.albumId || null,
    updatedAt: r.updatedAt.toISOString(),
    createdAt: r.createdAt.toISOString(),
  }
}