/**
 * SearchService — free-text search across albums, photos, members.
 *
 * Sprint 18 scope: match against the same fields the frontend
 * `searchAll` helper searches (title/period, caption/tags, name/role),
 * case-insensitively across all three locales (ja, id, en).
 *
 * Implementation note: the Sprint 17 repositories are reused as-is.
 * Corpus sizes are small (seeded), so filtering happens in memory on
 * the service layer — the SQL-side full-text search (tsvector) is a
 * Sprint 20+ concern once the photo library outgrows this.
 */

import type { AlbumRepository } from '../repositories/album-repository'
import type { MediaRepository } from '../repositories/media-repository'
import type { UserRepository } from '../repositories/user-repository'
import type { Result } from '../shared/result'
import { ok } from '../shared/result'
import type { Album, MediaItem, Member } from '../domain/models'
import type { L10n } from '../domain/models'

export type SearchServiceDeps = {
  albums: AlbumRepository
  media: MediaRepository
  users: UserRepository
}

const MAX_CORPUS = 500

/** Case-insensitive substring match over an L10n triplet or plain string. */
function l10nIncludes(value: L10n | string, needle: string): boolean {
  const n = needle.toLowerCase()
  if (typeof value === 'string') return value.toLowerCase().includes(n)
  return (
    value.ja.toLowerCase().includes(n) ||
    value.id.toLowerCase().includes(n) ||
    value.en.toLowerCase().includes(n)
  )
}

function plainIncludes(value: string, needle: string): boolean {
  return value.toLowerCase().includes(needle)
}

export function createSearchService(deps: SearchServiceDeps) {
  const { albums, media, users } = deps

  /** GET /search/albums?q= — matches title, period, slug. */
  async function searchAlbums(q: string): Promise<Result<Album[]>> {
    const needle = q.trim().toLowerCase()
    if (!needle) return ok([])
    // listAlbums clamps `limit` to MAX_LIMIT (100) — a single
    // { limit: MAX_CORPUS } call would silently search only the first
    // 100 albums. Page through the corpus instead; MAX_CORPUS stays the
    // hard stop.
    const corpus: Album[] = []
    const PAGE_SIZE = 100
    for (let pageIdx = 0; pageIdx * PAGE_SIZE < MAX_CORPUS; pageIdx++) {
      const page = await albums.listAlbums({ page: pageIdx, limit: PAGE_SIZE })
      if (!page.ok) return page
      corpus.push(...page.value.items)
      if (corpus.length >= page.value.total || page.value.items.length < PAGE_SIZE) break
    }
    const hits = corpus.filter(
      (a) =>
        l10nIncludes(a.title, needle) ||
        l10nIncludes(a.period, needle) ||
        plainIncludes(a.slug, needle),
    )
    return ok(hits)
  }

  /** GET /search/photos?q= — matches caption/tags/album slug. */
  async function searchPhotos(q: string): Promise<Result<MediaItem[]>> {
    const needle = q.trim().toLowerCase()
    if (!needle) return ok([])
    const items = await media.list({ limit: MAX_CORPUS })
    if (!items.ok) return items
    const hits = items.value.filter(
      (p) =>
        l10nIncludes(p.caption, needle) ||
        p.tags.some((t) => plainIncludes(t, needle)) ||
        plainIncludes(p.albumSlug, needle),
    )
    return ok(hits)
  }

  /** GET /search/members?q= — matches name/role across locales. */
  async function searchMembers(q: string): Promise<Result<Member[]>> {
    const needle = q.trim().toLowerCase()
    if (!needle) return ok([])
    const members = await users.listMembers()
    if (!members.ok) return members
    const hits = members.value.filter(
      (m) => l10nIncludes(m.name, needle) || l10nIncludes(m.role, needle),
    )
    return ok(hits)
  }

  return { searchAlbums, searchPhotos, searchMembers }
}

export type SearchService = ReturnType<typeof createSearchService>