/**
 * FetchSearchRepository — searches the Sprint 18 backend.
 *
 *   GET /search/albums?q=    → AlbumDto[]
 *   GET /search/photos?q=    → MediaDto[]
 *   GET /search/members?q=   → MemberDto[]
 *   GET /albums/timeline     → TimelineEntryDto[] (filtered in-memory —
 *                              the backend has no timeline search endpoint)
 *
 * Results are shaped into the same `SearchResults` the palette consumes
 * (search-utils.ts), so the UI is mode-agnostic.
 */

import type { ApiClient } from './api-client'
import type { SearchRepository } from './search-repository'
import type { AlbumDto, MemberDto, MediaDto, TimelineEntryDto } from '@/types/repository-dtos'
import { err, ok } from './result-helpers'
import type { RepositoryResult } from './result-helpers'
import type { Locale } from '@/lib/i18n'
import type { SearchResult, SearchResults } from '@/lib/search-utils'

// Mirrors the mock `searchAll` shape — presentation labels + hrefs stay
// identical so the palette renders the same groups.
function pick(value: { ja: string; id: string; en: string } | string, locale: Locale): string {
  return typeof value === 'string' ? value : (value[locale] ?? value.ja ?? value.id ?? value.en)
}

const empty = (): SearchResults => ({ albums: [], photos: [], members: [], timeline: [], total: 0 })

function toAlbumResult(a: AlbumDto, locale: Locale): SearchResult {
  return {
    id: a.slug,
    type: 'album',
    title: pick(a.title, locale),
    subtitle: pick(a.period, locale),
    image: a.cover,
    href: `/albums/${a.slug}`,
  }
}

function toPhotoResult(m: MediaDto, locale: Locale): SearchResult {
  return {
    id: m.src,
    type: 'photo',
    title: pick(m.caption, locale),
    subtitle: pick(m.ago, locale),
    image: m.src,
    href: `/albums/${m.albumSlug}`,
  }
}

function toMemberResult(m: MemberDto, locale: Locale): SearchResult {
  return {
    id: m.id,
    type: 'member',
    title: pick(m.name, locale),
    subtitle: pick(m.role, locale),
    image: m.avatar,
    href: '/favorites',
  }
}

function toTimelineResult(t: TimelineEntryDto, locale: Locale): SearchResult {
  return {
    id: t.date,
    type: 'timeline',
    title: pick(t.title, locale),
    subtitle: pick(t.description, locale),
    image: t.photo,
    href: '/timeline',
  }
}

function includesAny(texts: string[], q: string): boolean {
  const needle = q.toLowerCase()
  return texts.some((t) => t.toLowerCase().includes(needle))
}

export class FetchSearchRepository implements SearchRepository {
  constructor(private readonly api: ApiClient) {}

  async searchAll(query: string, locale: Locale): Promise<RepositoryResult<SearchResults>> {
    const q = query.trim()
    if (!q) return ok(empty())

    const queryObj = { q }
    const [albumsRes, photosRes, membersRes, timelineRes] = await Promise.all([
      this.api.request<AlbumDto[]>({ method: 'GET', path: '/search/albums', query: queryObj }),
      this.api.request<MediaDto[]>({ method: 'GET', path: '/search/photos', query: queryObj }),
      this.api.request<MemberDto[]>({ method: 'GET', path: '/search/members', query: queryObj }),
      this.api.request<TimelineEntryDto[]>({ method: 'GET', path: '/albums/timeline' }),
    ])

    if (!albumsRes.ok) return err<SearchResults>(albumsRes.error.code, albumsRes.error.message)
    if (!photosRes.ok) return err<SearchResults>(photosRes.error.code, photosRes.error.message)
    if (!membersRes.ok) return err<SearchResults>(membersRes.error.code, membersRes.error.message)
    if (!timelineRes.ok) return err<SearchResults>(timelineRes.error.code, timelineRes.error.message)

    const albums = albumsRes.data.map((a) => toAlbumResult(a, locale))
    const photos = photosRes.data.map((m) => toPhotoResult(m, locale))
    const members = membersRes.data.map((m) => toMemberResult(m, locale))
    const timeline = timelineRes.data
      .filter((t) =>
        includesAny([pick(t.title, locale), pick(t.description, locale)], q),
      )
      .map((t) => toTimelineResult(t, locale))

    return ok({
      albums,
      photos,
      members,
      timeline,
      total: albums.length + photos.length + members.length + timeline.length,
    })
  }
}