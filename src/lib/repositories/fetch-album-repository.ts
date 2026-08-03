/**
 * FetchAlbumRepository — reads albums/photos/timeline from the Sprint 18
 * Read API via FetchApiClient.
 *
 * Wire parity with the backend:
 *   GET /albums?page=&limit=&sort=&<filter>  → AlbumDto[] (bare array)
 *   GET /albums/summaries                   → summaries, date desc
 *   GET /albums/:slug                       → AlbumDto | 404
 *   GET /albums/:slug/photos                → PhotoDto[]
 *   GET /albums/:slug/photos/:idx           → PhotoDto | 400 | 404
 *   GET /albums/timeline                    → TimelineEntryDto[]
 *
 * Draft/editor methods are NOT part of Sprint 18 (backend has no write
 * API yet) — they return a transport error so the editor surfaces a
 * clear error state instead of a blank page.
 */

import type { ApiClient } from './api-client'
import type { AlbumDto, PhotoDto, TimelineEntryDto } from '@/types/repository-dtos'
import { toAlbum, toPhoto, toPhotoWithMeta, toTimelineEntry } from './dto-mappers'
import { err, ok } from './result-helpers'
import type { RepositoryResult } from './result-helpers'
import type { AlbumRepository } from './album-repository'
import type { Album, Photo, TimelineEntry } from '@/lib/data'
import type { AlbumDraft, AlbumSummary } from '@/types/album-editor'
import type { QueryOptions } from '@/types/repository'
import { toQueryParams } from '@/lib/api/query-builder'

export class FetchAlbumRepository implements AlbumRepository {
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
    const query = toQueryParams(opts)
    const res = await this.api.request<AlbumDto[]>({
      method: 'GET',
      path: '/albums',
      query: Object.fromEntries(query.entries()),
    })
    if (!res.ok) return err<Album[]>(res.error.code, res.error.message)
    return ok(res.data.map(toAlbum))
  }

  async getAlbum(slug: string): Promise<RepositoryResult<Album | null>> {
    const res = await this.api.request<AlbumDto>({
      method: 'GET',
      path: `/albums/${encodeURIComponent(slug)}`,
    })
    if (res.ok) return ok(toAlbum(res.data))
    if (res.status === 404) return ok(null)
    return err<Album | null>(res.error.code, res.error.message)
  }

  async listPhotos(slug: string, opts?: QueryOptions): Promise<RepositoryResult<Photo[]>> {
    const query = toQueryParams(opts)
    const res = await this.api.request<PhotoDto[]>({
      method: 'GET',
      path: `/albums/${encodeURIComponent(slug)}/photos`,
      query: Object.fromEntries(query.entries()),
    })
    if (!res.ok) return err<Photo[]>(res.error.code, res.error.message)
    return ok(res.data.map(toPhoto))
  }

  async getPhoto(slug: string, photoId: number | string): Promise<RepositoryResult<Photo | null>> {
    const res = await this.api.request<PhotoDto>({
      method: 'GET',
      path: `/albums/${encodeURIComponent(slug)}/photos/${encodeURIComponent(String(photoId))}`,
    })
    if (res.ok) return ok(toPhotoWithMeta(res.data))
    if (res.status === 404) return ok(null)
    return err<Photo | null>(res.error.code, res.error.message)
  }

  async listTimelineEntries(): Promise<RepositoryResult<TimelineEntry[]>> {
    const res = await this.api.request<TimelineEntryDto[]>({
      method: 'GET',
      path: '/albums/timeline',
    })
    if (!res.ok) return err<TimelineEntry[]>(res.error.code, res.error.message)
    return ok(res.data.map(toTimelineEntry))
  }

  /* ── Editor / write (Sprint 20) ───────────────────────────── */

  private async unsupported<T>(what: string): Promise<RepositoryResult<T>> {
    return err<T>('transport', `Draft ${what} belum tersedia — write API hadir di sprint berikutnya.`)
  }

  async existingSlugs(): Promise<RepositoryResult<string[]>> {
    return this.unsupported('slugs')
  }

  async getDraft(slug: string): Promise<RepositoryResult<AlbumDraft | null>> {
    return this.unsupported('draft')
  }

  async createDraft(_input: Omit<AlbumDraft, 'updatedAt'>): Promise<RepositoryResult<AlbumDraft>> {
    return this.unsupported('create')
  }

  async updateDraft(
    _slug: string,
    _patch: Partial<Omit<AlbumDraft, 'slug' | 'updatedAt'>>,
  ): Promise<RepositoryResult<AlbumDraft>> {
    return this.unsupported('update')
  }

  async deleteDraft(_slug: string): Promise<RepositoryResult<void>> {
    return this.unsupported('delete')
  }

  async publish(_slug: string): Promise<RepositoryResult<AlbumDraft>> {
    return this.unsupported('publish')
  }
}