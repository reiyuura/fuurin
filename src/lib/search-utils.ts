import type { Album, Member, Photo, TimelineEntry } from '@/lib/data'
import type { Locale } from '@/lib/i18n'

/* ── Unified result model ────────────────────────────────────────
   Every result carries id/type/title/subtitle/image/href so the UI
   never builds URLs itself. Pure module — datasets come via params. */

export type SearchResultType = 'album' | 'photo' | 'member' | 'timeline'

export type SearchResult = {
  id: string
  type: SearchResultType
  title: string
  subtitle?: string
  image?: string
  href: string
}

export type SearchInput = {
  albums: Album[]
  photos: Photo[]
  members: Member[]
  timeline: TimelineEntry[]
}

export type SearchResults = {
  albums: SearchResult[]
  photos: SearchResult[]
  members: SearchResult[]
  timeline: SearchResult[]
  total: number
}

/* ── Matching ──────────────────────────────────────────────────── */

function normalize(value: string): string {
  return value.trim().toLowerCase()
}

function includesAny(texts: (string | undefined)[], q: string): boolean {
  return texts.some((t) => (t ?? '').toLowerCase().includes(q))
}

/**
 * Case-insensitive, multi-locale search across every dataset.
 * Each category returns presentation-ready SearchResults (grouping
 * happens at the UI layer, not here).
 */
export function searchAll(
  input: SearchInput,
  query: string,
  locale: Locale,
): SearchResults {
  const q = normalize(query)
  const empty: SearchResults = { albums: [], photos: [], members: [], timeline: [], total: 0 }
  if (!q) return empty

  const albums: SearchResult[] = input.albums
    .filter((a) =>
      includesAny(
        [a.title.ja, a.title.id, a.title.en, a.period.ja, a.period.id, a.period.en, a.slug],
        q,
      ),
    )
    .map((a) => ({
      id: a.slug,
      type: 'album' as const,
      title: a.title[locale] ?? a.title.ja,
      subtitle: a.period[locale] ?? a.period.ja,
      image: a.cover,
      href: `/albums/${a.slug}`,
    }))

  const photos: SearchResult[] = input.photos
    .filter((p) => includesAny([p.caption.ja, p.caption.id, p.caption.en, ...p.tags], q))
    .map((p) => ({
      id: p.src,
      type: 'photo' as const,
      title: p.caption[locale] ?? p.caption.ja,
      subtitle: p.ago[locale] ?? p.ago.ja,
      image: p.src,
      href: `/albums/${p.album}`,
    }))

  const members: SearchResult[] = input.members
    .filter((m) => includesAny([m.name.ja, m.name.id, m.name.en, m.role.ja, m.role.id, m.role.en], q))
    .map((m) => ({
      id: m.id,
      type: 'member' as const,
      title: m.name[locale] ?? m.name.ja,
      subtitle: m.role[locale] ?? m.role.ja,
      image: m.avatar,
      href: `/favorites`,
    }))

  const timeline: SearchResult[] = input.timeline
    .filter((t) =>
      includesAny([t.title.ja, t.title.id, t.title.en, t.body.ja, t.body.id, t.body.en], q),
    )
    .map((t) => ({
      id: t.date,
      type: 'timeline' as const,
      title: t.title[locale] ?? t.title.ja,
      subtitle: t.date,
      image: t.photo,
      href: `/timeline`,
    }))

  return {
    albums,
    photos,
    members,
    timeline,
    total: albums.length + photos.length + members.length + timeline.length,
  }
}

/* ── Highlighting ──────────────────────────────────────────────── */

export type HighlightPart = { text: string; match: boolean }

/**
 * Split `text` into segments around every case-insensitive occurrence
 * of `query`. Renderer maps them to <mark> for matches.
 */
export function highlightParts(text: string, query: string): HighlightPart[] {
  const q = query.trim()
  if (!q) return [{ text, match: false }]

  const lower = text.toLowerCase()
  const needle = q.toLowerCase()
  const parts: HighlightPart[] = []
  let cursor = 0

  for (;;) {
    const idx = lower.indexOf(needle, cursor)
    if (idx === -1) {
      if (cursor < text.length) parts.push({ text: text.slice(cursor), match: false })
      break
    }
    if (idx > cursor) parts.push({ text: text.slice(cursor, idx), match: false })
    parts.push({ text: text.slice(idx, idx + q.length), match: true })
    cursor = idx + q.length
  }

  return parts
}

/* ── Photo filtering / sorting (pure) ──────────────────────────── */

export type PhotoFilter = {
  tag?: string
  favorite?: boolean
  orientation?: 'landscape' | 'portrait'
  /** Album slug — matches against the photo's `album` field. */
  album?: string
}

export function filterPhotos<T extends { src: string; album: string; tags: string[]; orientation?: string }>(
  photos: T[],
  filter: PhotoFilter,
  isFavorite?: (src: string) => boolean,
): T[] {
  return photos.filter((p) => {
    if (filter.tag && filter.tag !== 'all' && !p.tags.includes(filter.tag)) return false
    if (filter.album && filter.album !== 'all' && p.album !== filter.album) return false
    if (filter.orientation && p.orientation !== filter.orientation) return false
    if (filter.favorite && isFavorite && !isFavorite(p.src)) return false
    return true
  })
}

export type PhotoSortKey = 'newest' | 'oldest' | 'popular'

/** Deterministic photo sort — popularity is mock (likes). */
export function sortPhotos<T extends { likes: number }>(photos: T[], sort: PhotoSortKey): T[] {
  const sorted = [...photos]
  switch (sort) {
    case 'popular':
      return sorted.sort((a, b) => b.likes - a.likes)
    case 'oldest':
      return sorted.reverse()
    case 'newest':
    default:
      return sorted
  }
}
