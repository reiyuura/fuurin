/**
 * MediaService — read-side business logic for media items.
 *
 * Wire format parity with `mock-api-client.ts`:
 *  - GET /media → bare array, filters via query params (album, tag…)
 *  - GET /media/:id → single item; malformed id → 400, missing → 404
 */

import type { MediaRepository } from '../repositories/media-repository'
import type { Result } from '../shared/result'
import { err } from '../shared/result'
import type { MediaItem } from '../domain/models'
import type { QueryOptions } from '../shared/paging'

export type MediaServiceDeps = {
  media: MediaRepository
}

export function createMediaService(deps: MediaServiceDeps) {
  const { media } = deps

  return {
    /** GET /media — bare array; filters forwarded as QueryOptions. */
    async list(opts?: QueryOptions): Promise<Result<MediaItem[]>> {
      return media.list(opts)
    },

    /** GET /media/:id — parse `${albumSlug}:${idx}`, 400 on malformed. */
    async get(id: string): Promise<Result<MediaItem | null>> {
      const lastColon = id.lastIndexOf(':')
      if (lastColon <= 0 || lastColon === id.length - 1) {
        return err('validation', 'id media tidak valid.', { id })
      }
      const idx = Number(id.slice(lastColon + 1))
      if (!Number.isInteger(idx) || idx < 0) {
        return err('validation', 'id media tidak valid.', { id })
      }
      return media.get(id)
    },
  }
}

export type MediaService = ReturnType<typeof createMediaService>