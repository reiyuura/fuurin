import { ALBUMS, getAlbumPhotos, type Album } from '@/lib/data'
import { mediaId, type MediaItem } from '@/types/media'
import { pick } from '@/lib/data'
import type { Locale } from '@/lib/i18n'

/* ── Flatten all albums into a single media list ──────────────── */

/** Flatten every album's photos into one ordered list. Album-level
 *  data is added so the list can be filtered/sorted without going
 *  back to the source albums. */
export function flattenMedia(albums: Album[] = ALBUMS, perAlbum = 36): MediaItem[] {
  const items: MediaItem[] = []
  for (const album of albums) {
    const photos = getAlbumPhotos(album.slug, perAlbum)
    photos.forEach((p, idx) => {
      items.push({
        id: mediaId(album.slug, idx),
        albumSlug: album.slug,
        idx,
        src: p.src,
        caption: p.caption,
        ago: p.ago,
        tags: p.tags,
        likes: p.likes,
        orientation: p.orientation ?? 'landscape',
        date: album.date,
      })
    })
  }
  return items
}

/* ── Sort key union ───────────────────────────────────────────── */

export type MediaSortKey = 'newest' | 'oldest' | 'name-az' | 'name-za'

/**
 * Locale-aware sort. The list is sorted using the caption in the user's
 * active locale, falling back to English when a locale value is missing.
 * Pure — no random, no mock imports beyond the input.
 */
export function sortMedia(
  items: MediaItem[],
  sort: MediaSortKey,
  locale: Locale,
): MediaItem[] {
  const sorted = [...items]
  const title = (item: MediaItem) => pick(item.caption, locale) || pick(item.caption, 'en')

  switch (sort) {
    case 'newest':
      return sorted.sort((a, b) => b.date.localeCompare(a.date) || b.idx - a.idx)
    case 'oldest':
      return sorted.sort((a, b) => a.date.localeCompare(b.date) || a.idx - b.idx)
    case 'name-az':
      return sorted.sort((a, b) => title(a).localeCompare(title(b), locale))
    case 'name-za':
      return sorted.sort((a, b) => title(b).localeCompare(title(a), locale))
    default:
      return sorted
  }
}

/* ── Album-scoped options (derived, deterministic) ────────────── */

/**
 * Album list with counts derived from the flattened media. The UI
 * receives these as filter options — never hardcodes album titles.
 */
export function buildMediaAlbumOptions(items: MediaItem[]): Array<{
  slug: string
  count: number
}> {
  const counts = new Map<string, number>()
  for (const item of items) {
    counts.set(item.albumSlug, (counts.get(item.albumSlug) ?? 0) + 1)
  }
  return ALBUMS
    .map((a) => ({ slug: a.slug, count: counts.get(a.slug) ?? 0 }))
    .filter((o) => o.count > 0)
}

/** Distinct tags present in the dataset — for the tag filter. */
export function buildMediaTagOptions(items: MediaItem[]): string[] {
  const set = new Set<string>()
  for (const item of items) for (const t of item.tags) set.add(t)
  return [...set].sort()
}
