/**
 * MockMediaRepository — reads via ApiClient, maps DTO → MediaItem.
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
import { mediaId } from '@/types/media'

export class MockMediaRepository implements MediaRepository {
  constructor(private readonly api: ApiClient) {}

  async list(opts?: QueryOptions): Promise<RepositoryResult<MediaItem[]>> {
    const query: Record<string, string | number | boolean | undefined | null> = {}
    if (opts?.filter?.album) query.album = String(opts.filter.album)
    if (opts?.filter?.tag) query.tag = String(opts.filter.tag)
    const res = await this.api.request<MediaDto[]>({
      method: 'GET',
      path: '/media',
      query,
    })
    if (!res.ok) return err<MediaItem[]>(res.error.code, res.error.message)
    return ok(res.data.map(toMediaItem))
  }

  async get(id: string): Promise<RepositoryResult<MediaItem | null>> {
    const parsed = parseMediaId(id)
    if (!parsed) return ok(null)
    // Walk the cached list — mock has no single-item GET endpoint.
    const list = await this.list({ filter: { album: parsed.albumSlug } })
    if (!list.ok) return err<MediaItem | null>(list.error.code, list.error.message)
    const hit = list.value.find((m) => m.idx === parsed.idx && m.albumSlug === parsed.albumSlug)
    return ok(hit ?? null)
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
    const list = await this.list({ filter })
    if (!list.ok) return err<MediaItem[]>(list.error.code, list.error.message)
    const q = query.trim().toLowerCase()
    let pool = list.value
    if (q) {
      pool = pool.filter((m) => {
        const hay = [m.caption.ja, m.caption.id, m.caption.en].join(' ').toLowerCase()
        return hay.includes(q)
      })
    }
    if (sort) {
      const spec = Array.isArray(sort) ? sort[0] : sort
      if (spec?.key === 'date') {
        pool = [...pool].sort((a, b) =>
          spec.direction === 'asc' ? a.date.localeCompare(b.date) : b.date.localeCompare(a.date),
        )
      }
    }
    return ok(pool)
  }

  /* ── Write — unsupported in mock mode. The real backend write
        pipeline lands in Sprint 19 (fetch mode only). Surface a
        clear error instead of silently no-oping. */

  async createPhoto(): Promise<RepositoryResult<MediaItem>> {
    return err<MediaItem>('transport', 'createPhoto belum tersedia — mock mode tanpa backend.')
  }
  async updatePhoto(): Promise<RepositoryResult<MediaItem>> {
    return err<MediaItem>('transport', 'updatePhoto belum tersedia — mock mode tanpa backend.')
  }
  async deletePhoto(): Promise<RepositoryResult<void>> {
    return err<void>('transport', 'deletePhoto belum tersedia — mock mode tanpa backend.')
  }
}

// Re-export the stable id helper for callers that need to derive.
export { mediaId }
