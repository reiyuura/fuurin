/**
 * FetchMediaRepository — reads media from the Sprint 18 Read API.
 *
 * Wire parity with the backend:
 *   GET /media?album=&tag=&page=&limit=&sort=  → MediaDto[]
 *   GET /media/:id                             → MediaDto | 400 | 404
 *   GET /search/photos?q=                      → MediaDto[] (search)
 */

import type { ApiClient } from './api-client'
import type { MediaDto } from '@/types/repository-dtos'
import { toMediaItem } from './dto-mappers'
import { err, ok } from './result-helpers'
import type { RepositoryResult } from './result-helpers'
import type { MediaRepository } from './media-repository'
import type { MediaItem } from '@/types/media'
import { parseMediaId } from '@/types/media'
import type { QueryOptions } from '@/types/repository'
import { toQueryParams } from '@/lib/api/query-builder'

export class FetchMediaRepository implements MediaRepository {
  constructor(private readonly api: ApiClient) {}

  async list(opts?: QueryOptions): Promise<RepositoryResult<MediaItem[]>> {
    const query = toQueryParams(opts)
    const res = await this.api.request<MediaDto[]>({
      method: 'GET',
      path: '/media',
      query: Object.fromEntries(query.entries()),
    })
    if (!res.ok) return err<MediaItem[]>(res.error.code, res.error.message)
    return ok(res.data.map(toMediaItem))
  }

  async get(id: string): Promise<RepositoryResult<MediaItem | null>> {
    const parsed = parseMediaId(id)
    if (!parsed) return ok(null)
    const res = await this.api.request<MediaDto>({
      method: 'GET',
      path: `/media/${encodeURIComponent(id)}`,
    })
    if (res.ok) return ok(toMediaItem(res.data))
    if (res.status === 404) return ok(null)
    return err<MediaItem | null>(res.error.code, res.error.message)
  }

  async search({
    query,
    filter,
    sort,
  }: {
    query: string
    filter?: QueryOptions['filter']
    sort?: QueryOptions['sort']
  }): Promise<RepositoryResult<MediaItem[]>> {
    const params = toQueryParams({ filter, sort })
    params.set('q', query)
    const res = await this.api.request<MediaDto[]>({
      method: 'GET',
      path: '/search/photos',
      query: Object.fromEntries(params.entries()),
    })
    if (!res.ok) return err<MediaItem[]>(res.error.code, res.error.message)
    return ok(res.data.map(toMediaItem))
  }
}