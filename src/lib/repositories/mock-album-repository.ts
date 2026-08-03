/**
 * MockAlbumRepository — DTO ↔ Domain boundary.
 *
 * Speaks to `ApiClient` (mock or fetch). Internally:
 *   apiClient → DTO → mapper → Domain → Result
 *
 * Sprint 14: swap the ApiClient singleton to a real one; this file
 * doesn't change.
 */

import type { ApiClient } from './api-client'
import type {
  AlbumDraftInputDto,
  AlbumDraftPatchDto,
  AlbumDto,
  PhotoDto,
} from '@/types/repository-dtos'
import { toAlbum, toPhoto, toTimelineEntry } from './dto-mappers'
import { err, ok } from './result-helpers'
import type { RepositoryResult } from '@/types/repository'
import type { AlbumRepository } from './album-repository'
import type {
  Album,
  Photo,
  TimelineEntry,
} from '@/lib/data'
import type { AlbumDraft, AlbumSummary } from '@/types/album-editor'
import type { QueryOptions } from '@/types/repository'
import type { TimelineEntryDto } from '@/types/repository-dtos'

const SEED_PHOTO_COUNT = 36

export class MockAlbumRepository implements AlbumRepository {
  constructor(private readonly api: ApiClient) {}

  /* ── Read ─────────────────────────────────────────────────── */

  async listSummaries(): Promise<RepositoryResult<AlbumSummary[]>> {
    const res = await this.api.request<AlbumSummary[]>({
      method: 'GET',
      path: '/albums/summaries',
    })
    return res.ok ? ok(res.data) : err<AlbumSummary[]>(res.error.code, res.error.message)
  }

  async listAlbums(opts?: QueryOptions): Promise<RepositoryResult<Album[]>> {
    const res = await this.api.request<AlbumDto[]>({ method: 'GET', path: '/albums' })
    if (!res.ok) return err<Album[]>(res.error.code, res.error.message)
    let albums = res.data.map(toAlbum)
    const filter = opts?.filter
    if (filter) {
      if (typeof filter.category === 'string') {
        albums = albums.filter((a) => a.category === filter.category)
      }
    }
    const sort = Array.isArray(opts?.sort) ? opts?.sort?.[0] : opts?.sort
    if (sort?.key === 'date') {
      albums = [...albums].sort((a, b) =>
        sort.direction === 'asc' ? a.date.localeCompare(b.date) : b.date.localeCompare(a.date),
      )
    }
    return ok(albums)
  }

  async getAlbum(slug: string): Promise<RepositoryResult<Album | null>> {
    const res = await this.api.request<AlbumDto>({
      method: 'GET',
      path: `/albums/${encodeURIComponent(slug)}`,
    })
    if (res.ok) return ok(toAlbum(res.data) as Album | null)
    if (res.status === 404) return ok(null)
    return err<Album | null>(res.error.code, res.error.message)
  }

  async listPhotos(slug: string): Promise<RepositoryResult<Photo[]>> {
    const res = await this.api.request<PhotoDto[]>({
      method: 'GET',
      path: `/albums/${encodeURIComponent(slug)}/photos`,
    })
    if (!res.ok) return err<Photo[]>(res.error.code, res.error.message)
    return ok(res.data.map(toPhoto))
  }

  async getPhoto(slug: string, photoId: number | string): Promise<RepositoryResult<Photo | null>> {
    const res = await this.api.request<PhotoDto>({
      method: 'GET',
      path: `/albums/${encodeURIComponent(slug)}/photos/${encodeURIComponent(String(photoId))}`,
    })
    if (res.ok) return ok(toPhoto(res.data))
    if (res.status === 404) return ok(null)
    return err<Photo | null>(res.error.code, res.error.message)
  }

  /* ── Editor / write ───────────────────────────────────────── */

  async existingSlugs(): Promise<RepositoryResult<string[]>> {
    const res = await this.api.request<string[]>({
      method: 'GET',
      path: '/albums/drafts/slugs',
    })
    return res.ok ? ok(res.data) : err<string[]>(res.error.code, res.error.message)
  }

  async getDraft(slug: string): Promise<RepositoryResult<AlbumDraft | null>> {
    // Read album → derive draft (photoIds = first SEED_PHOTO_COUNT ids).
    const album = await this.getAlbum(slug)
    if (!album.ok) return err<AlbumDraft | null>(album.error.code, album.error.message)
    if (!album.value) return ok(null)
    const draft: AlbumDraft = {
      slug: album.value.slug,
      title: album.value.title.en ?? album.value.title.id ?? album.value.title.ja,
      description: '',
      date: album.value.date,
      location: '',
      visibility: 'published',
      coverMediaId: `${album.value.slug}:0`,
      photoIds: Array.from({ length: SEED_PHOTO_COUNT }, (_, i) => `${album.value!.slug}:${i}`),
      updatedAt: Date.now(),
    }
    return ok(draft)
  }

  async createDraft(input: Omit<AlbumDraft, 'updatedAt'>): Promise<RepositoryResult<AlbumDraft>> {
    const body: AlbumDraftInputDto = { ...input, updatedAt: Date.now() }
    const res = await this.api.request<AlbumDraftInputDto>({
      method: 'POST',
      path: '/albums/drafts',
      body,
    })
    if (!res.ok) return err<AlbumDraft>(res.error.code, res.error.message)
    return ok({ ...input, updatedAt: Date.now() })
  }

  async updateDraft(
    slug: string,
    patch: Partial<Omit<AlbumDraft, 'slug' | 'updatedAt'>>,
  ): Promise<RepositoryResult<AlbumDraft>> {
    const patchDto: AlbumDraftPatchDto = {
      title: patch.title,
      description: patch.description,
      date: patch.date,
      location: patch.location,
      visibility: patch.visibility,
      coverMediaId: patch.coverMediaId,
      photoIds: patch.photoIds,
    }
    const res = await this.api.request<AlbumDraftInputDto>({
      method: 'PATCH',
      path: `/albums/drafts/${encodeURIComponent(slug)}`,
      body: patchDto,
    })
    if (!res.ok) return err<AlbumDraft>(res.error.code, res.error.message)
    const stored = res.data
    return ok({
      slug: stored.slug,
      title: stored.title,
      description: stored.description,
      date: stored.date,
      location: stored.location,
      visibility: stored.visibility,
      coverMediaId: stored.coverMediaId,
      photoIds: stored.photoIds,
      updatedAt: stored.updatedAt,
    })
  }

  async deleteDraft(slug: string): Promise<RepositoryResult<void>> {
    const res = await this.api.request<{ slug: string }>({
      method: 'DELETE',
      path: `/albums/drafts/${encodeURIComponent(slug)}`,
    })
    if (!res.ok) return err<void>(res.error.code, res.error.message)
    return ok(undefined)
  }

  async publish(slug: string): Promise<RepositoryResult<AlbumDraft>> {
    return this.updateDraft(slug, { visibility: 'published' })
  }

  async listTimelineEntries(): Promise<RepositoryResult<TimelineEntry[]>> {
    const res = await this.api.request<TimelineEntryDto[]>({
      method: 'GET',
      path: '/albums/timeline',
    })
    if (!res.ok) return err<TimelineEntry[]>(res.error.code, res.error.message)
    return ok(res.data.map(toTimelineEntry))
  }
}
