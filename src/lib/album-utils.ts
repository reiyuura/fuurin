import type { Album, AlbumCategory } from '@/lib/data'

/* ── Public types ───────────────────────────────────────────── */

export type AlbumSortKey = 'newest' | 'oldest' | 'most-photos' | 'alphabetical' | 'name-desc'

export type AlbumFilter = {
  query: string
  category: AlbumCategory | 'all'
  /** ISO year, e.g. "2026" — matches album.date prefix. */
  year?: string
  /** 1-based month, e.g. "4" for April. */
  month?: string
  /** Tag name — matched against tagsByAlbum (derived in the data layer). */
  tag?: string
}

/* ── Filtering ──────────────────────────────────────────────── */

/**
 * Normalize search input — trim + lowercase so matching is stable
 * regardless of how the user types.
 */
function normalize(value: string): string {
  return value.trim().toLowerCase()
}

/**
 * Searchable text of an album: title, period, and category label —
 * all locales, so a query matches any language.
 */
function searchable(album: Album): string {
  const { title, period, category } = album
  return [title.ja, title.id, title.en, period.ja, period.id, period.en, category]
    .join(' ')
    .toLowerCase()
}

export function filterAlbums(
  albums: Album[],
  filter: AlbumFilter,
  tagsByAlbum?: Record<string, string[]>,
): Album[] {
  const q = normalize(filter.query)
  return albums.filter((album) => {
    if (filter.category !== 'all' && album.category !== filter.category) {
      return false
    }
    if (filter.year && !album.date.startsWith(filter.year)) {
      return false
    }
    if (filter.month) {
      const month = album.date.slice(5, 7) // "2026-04-05" → "04"
      const want = filter.month.padStart(2, '0')
      if (month !== want) return false
    }
    if (filter.tag && tagsByAlbum && !tagsByAlbum[album.slug]?.includes(filter.tag)) {
      return false
    }
    if (q && !searchable(album).includes(q)) {
      return false
    }
    return true
  })
}

/* ── Sorting ────────────────────────────────────────────────── */

export function sortAlbums(albums: Album[], sort: AlbumSortKey): Album[] {
  const sorted = [...albums]
  switch (sort) {
    case 'newest':
      return sorted.sort((a, b) => b.date.localeCompare(a.date))
    case 'oldest':
      return sorted.sort((a, b) => a.date.localeCompare(b.date))
    case 'most-photos':
      return sorted.sort((a, b) => b.count - a.count)
    case 'alphabetical':
      return sorted.sort((a, b) => a.title.en.localeCompare(b.title.en))
    case 'name-desc':
      return sorted.sort((a, b) => b.title.en.localeCompare(a.title.en))
    default:
      return sorted
  }
}

/* ── Category list builder ──────────────────────────────────── */

export type AlbumCategoryOption = {
  value: AlbumCategory | 'all'
  label: string
  count: number
}

/** Derive category options from data — counts stay accurate automatically. */
export function buildCategoryOptions(albums: Album[]): AlbumCategoryOption[] {
  const counts = new Map<AlbumCategory, number>()
  for (const album of albums) {
    counts.set(album.category, (counts.get(album.category) ?? 0) + 1)
  }

  const options: AlbumCategoryOption[] = [
    { value: 'all', label: 'All', count: albums.length },
  ]

  for (const [value, count] of counts) {
    options.push({ value, label: value, count })
  }

  return options
}

/* ── Tag options (photos) ─────────────────────────────────────── */

export type TagOption = {
  value: string
  label: string
  count: number
}

/** Derive tag options from a photo list — counts from the dataset. */
export function buildTagOptions(photos: { tags: string[] }[]): TagOption[] {
  const counts = new Map<string, number>()
  for (const photo of photos) {
    for (const tag of new Set(photo.tags)) {
      counts.set(tag, (counts.get(tag) ?? 0) + 1)
    }
  }

  return [
    { value: 'all', label: 'All', count: photos.length },
    ...[...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([value, count]) => ({ value, label: value, count })),
  ]
}

/* ── Related albums ───────────────────────────────────────────── */

/**
 * Same-category albums first (by recency), then remaining albums —
 * limited to what the dataset actually contains, no placeholders.
 */
export function getRelatedAlbums(current: Album, albums: Album[], limit = 4): Album[] {
  const rest = albums.filter((a) => a.slug !== current.slug)
  const sameCategory = rest
    .filter((a) => a.category === current.category)
    .sort((a, b) => b.date.localeCompare(a.date))
  const others = rest
    .filter((a) => a.category !== current.category)
    .sort((a, b) => b.date.localeCompare(a.date))
  return [...sameCategory, ...others].slice(0, limit)
}

/* ── Related photos ───────────────────────────────────────────── */

/**
 * Photos following the current one (same album), excluding it —
 * deterministic order, capped at `limit`, no placeholders.
 */
export function getRelatedPhotos<T extends { src: string }>(
  photos: T[],
  photoId: string,
  limit = 6,
): T[] {
  const idx = Number(photoId)
  if (!Number.isInteger(idx) || idx < 0 || idx >= photos.length) return []
  return photos.slice(idx + 1, idx + 1 + limit)
}
