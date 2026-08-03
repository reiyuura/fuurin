/**
 * MediaService + MemberService + SearchService unit tests — fakes, no DB.
 */

import { describe, expect, it } from 'vitest'
import { createMediaService } from '../../src/services/media-service'
import { createMemberService } from '../../src/services/member-service'
import { createSearchService } from '../../src/services/search-service'
import type { MediaRepository } from '../../src/repositories/media-repository'
import type { UserRepository } from '../../src/repositories/user-repository'
import { ok } from '../../src/shared/result'
import type { MediaItem, Member } from '../../src/domain/models'

const mediaItem = (id: string, slug: string, caption: string, tags: string[] = []): MediaItem => ({
  id,
  albumSlug: slug,
  idx: 0,
  src: `https://example.com/${id}.jpg`,
  caption: { ja: caption, id: caption, en: caption },
  ago: { ja: '前', id: 'lalu', en: 'ago' },
  tags,
  likes: 0,
  orientation: 'landscape',
  date: '2026-01-01',
})

const member = (id: string, name: string, role: string): Member => ({
  id,
  name: { ja: name, id: name, en: name },
  role: { ja: role, id: role, en: role },
  initial: name.charAt(0),
  avatar: `https://example.com/${id}.jpg`,
})

const fakeMedia: MediaRepository = {
  list: async (opts) => {
    const all = [
      mediaItem('m1', 'spring', 'Sakura picnic', ['Hanami']),
      mediaItem('m2', 'study', 'Math class', ['Belajar']),
    ]
    const album = opts?.filter?.album
    return ok(album ? all.filter((m) => m.albumSlug === album) : all)
  },
  get: async (id) => ok(id === 'spring:0' ? mediaItem('m1', 'spring', 'Sakura') : null),
  search: async () => ok([]),
}

const fakeUsers: UserRepository = {
  currentUser: async () => ok(null),
  updateProfile: async (patch) => ok({ id: 'u1', name: patch.name ?? 'Rei', email: 'rei@fuurin.id', role: 'admin', avatar: patch.avatar ?? '' }),
  listMembers: async () =>
    ok([
      member('m-1', 'Haruka', 'Ketua'),
      member('m-2', 'Kenta', 'Wakil'),
    ]),
}

describe('MediaService', () => {
  it('list forwards filters to the repository', async () => {
    const svc = createMediaService({ media: fakeMedia })
    const r = await svc.list({ filter: { album: 'spring' } })
    if (!r.ok) throw new Error('expected ok')
    expect(r.value).toHaveLength(1)
    expect(r.value[0]!.albumSlug).toBe('spring')
  })

  it('get returns the item, null when missing', async () => {
    const svc = createMediaService({ media: fakeMedia })
    const found = await svc.get('spring:0')
    expect(found.ok && (found as { value: MediaItem | null }).value?.id).toBe('m1')
    const missing = await svc.get('nope:3')
    expect(missing.ok && (missing as { value: MediaItem | null }).value).toBeNull()
  })

  it('get rejects a malformed id as validation', async () => {
    const svc = createMediaService({ media: fakeMedia })
    const bad = await svc.get('no-colon')
    expect(bad.ok).toBe(false)
    if (!bad.ok) expect(bad.error.code).toBe('validation')
  })
})

describe('MemberService', () => {
  it('lists members', async () => {
    const svc = createMemberService({ users: fakeUsers })
    const r = await svc.list()
    if (!r.ok) throw new Error('expected ok')
    expect(r.value).toHaveLength(2)
  })
})

describe('SearchService', () => {
  const albumsRepo: import('../../src/repositories/album-repository').AlbumRepository = {
    listSummaries: async () => ok([]),
    listAlbums: async () =>
      ok({ items: [
        { slug: 'hanami', title: { ja: '花見', id: 'Hanami', en: 'Hanami' }, period: { ja: '春', id: 'Musim semi', en: 'Spring' }, count: 1, views: 1, cover: 'c', date: '2026-01-01', season: 'spring', category: 'festival' },
        { slug: 'study', title: { ja: '勉強', id: 'Belajar', en: 'Study' }, period: { ja: '夏', id: 'Musim panas', en: 'Summer' }, count: 1, views: 1, cover: 'c', date: '2026-02-01', season: 'summer', category: 'school' },
      ], total: 2, page: 0, size: 20 }),
    getAlbum: async () => ok(null),
    listPhotos: async () => ok([]),
    getPhoto: async () => ok(null),
    listTimelineEntries: async () => ok([]),
  }

  const svc = createSearchService({
    albums: albumsRepo,
    media: fakeMedia,
    users: fakeUsers,
  })

  it('searchAlbums matches title across locales case-insensitively', async () => {
    const r = await svc.searchAlbums('hanami')
    if (!r.ok) throw new Error('expected ok')
    expect(r.value.map((a) => a.slug)).toEqual(['hanami'])
  })

  it('searchAlbums returns empty for no match', async () => {
    const r = await svc.searchAlbums('zzz')
    if (!r.ok) throw new Error('expected ok')
    expect(r.value).toHaveLength(0)
  })

  it('searchPhotos matches caption and tags', async () => {
    const byCaption = await svc.searchPhotos('sakura')
    if (!byCaption.ok) throw new Error('expected ok')
    expect(byCaption.value.map((m) => m.id)).toEqual(['m1'])
    const byTag = await svc.searchPhotos('belajar')
    if (!byTag.ok) throw new Error('expected ok')
    expect(byTag.value.map((m) => m.id)).toEqual(['m2'])
  })

  it('searchMembers matches name or role', async () => {
    const r = await svc.searchMembers('ketua')
    if (!r.ok) throw new Error('expected ok')
    expect(r.value.map((m) => m.id)).toEqual(['m-1'])
  })
})