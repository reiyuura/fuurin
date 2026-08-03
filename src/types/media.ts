/**
 * Media Library — shared types.
 *
 * The single source of truth for any photo that lives anywhere in the
 * app: gallery, search, upload, CRUD, repository, future API. Components
 * MUST NOT recompose this type locally.
 */

import type { L10n } from '@/lib/data'

export type MediaOrientation = 'landscape' | 'portrait'

/**
 * A flattened photo row — combines a photo's source coordinates within
 * its album (`albumSlug` + `idx`) with its presentation data.
 *
 * Coordinates are required so a single image URL shared by multiple
 * albums (deterministic URL pool) keeps a unique stable identity.
 */
export type MediaItem = {
  /** Stable id derived from `(albumSlug, idx)` via `mediaId()`. */
  id: string
  albumSlug: string
  /** Photo index inside `getAlbumPhotos(albumSlug)`. */
  idx: number
  src: string
  caption: L10n
  ago: L10n
  tags: string[]
  likes: number
  orientation: MediaOrientation
  /** ISO date of the parent album — used for "newest"/"oldest" sort. */
  date: string
}

/**
 * Single helper that produces a stable media id.
 *
 * Every place that needs to identify a media row — selection sets,
 * drawer focus, deep links, navigation, repository rows — must call
 * this helper. Do NOT inline `` `${slug}:${i}` `` anywhere else.
 */
export function mediaId(albumSlug: string, idx: number): string {
  return `${albumSlug}:${idx}`
}

/** Parsed media id — `null` when malformed. */
export function parseMediaId(id: string): { albumSlug: string; idx: number } | null {
  const idx = id.lastIndexOf(':')
  if (idx <= 0 || idx === id.length - 1) return null
  const albumSlug = id.slice(0, idx)
  const n = Number(id.slice(idx + 1))
  if (!Number.isInteger(n) || n < 0) return null
  return { albumSlug, idx: n }
}
