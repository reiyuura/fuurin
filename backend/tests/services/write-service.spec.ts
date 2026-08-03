/**
 * WriteService unit tests — fake repositories, no DB.
 *
 * Focus: business rules (slug uniqueness, owner resolution,
 * pre-existence checks for album refs) without going through Prisma.
 */

import { describe, expect, it } from 'vitest'
import { createWriteService } from '../../src/services/write-service'
import type {
  AlbumWriteRepository,
  MediaWriteRepository,
  TimelineWriteRepository,
  MemberWriteRepository,
} from '../../src/repositories/write-repositories'
import type { AlbumRepository } from '../../src/repositories/album-repository'
import { ok, err } from '../../src/shared/result'
import type { Album, MediaItem, TimelineEntry, Member } from '../../src/domain/models'

const album = (slug: string): Album => ({
  slug, title: { ja: 't', id: 't', en: 't' }, period: { ja: 'p', id: 'p', en: 'p' },
  count: 0, views: 0, cover: 'c', date: '2026-01-01', season: 'spring', category: 'school',
})
const media = (id: string, slug: string, idx: number): MediaItem => ({
  id, albumSlug: slug, idx, src: 'p.jpg', caption: { ja: 't', id: 't', en: 't' },
  ago: { ja: '', id: '', en: '' }, tags: [], likes: 0, orientation: 'landscape', date: '2026-01-01',
})
const timeline = (id: string): TimelineEntry => ({
  id, date: '2026-01-01', title: { ja: 't', id: 't', en: 't' }, description: { ja: 't', id: 't', en: 't' },
  tag: 'kelas', photo: 't.jpg',
})
const member = (id: string, nameJa: string): Member => ({
  id, name: { ja: nameJa, id: nameJa, en: nameJa }, role: { ja: '', id: '', en: '' },
  initial: nameJa.charAt(0), avatar: 'a.jpg',
})

function makeSvc(opts: {
  existingAlbum?: Album | null
  existingMedia?: MediaItem | null
  createdAlbum?: Album
  updatedAlbum?: Album
  createdMedia?: MediaItem
  createdTimeline?: TimelineEntry
  createdMember?: Member
  ownerId?: string
  ownerResolutionError?: boolean
} = {}) {
  const reads = new Map<string, Album>()
  if (opts.existingAlbum !== undefined) {
    if (opts.existingAlbum) reads.set(opts.existingAlbum.slug, opts.existingAlbum)
  }
  const readAlbums: AlbumRepository = {
    listSummaries: async () => ok([]),
    listAlbums: async () => ok({ items: [], total: 0, page: 0, size: 0 }),
    getAlbum: async (slug) => ok(reads.get(slug) ?? null),
    listPhotos: async () => ok([]),
    getPhoto: async () => ok(opts.existingMedia ?? null),
    listTimelineEntries: async () => ok([]),
  }
  const writes = {
    createAlbum: async (input: any) => ok(opts.createdAlbum ?? { ...album(input.slug), ...input }),
    updateAlbum: async () => ok(opts.updatedAlbum ?? album('x')),
    deleteAlbum: async () => ok(undefined),
    createPhoto: async (input: any) => ok(opts.createdMedia ?? media(`${input.albumSlug}:${input.idx}`, input.albumSlug, input.idx)),
    updatePhoto: async () => ok(opts.createdMedia ?? media('x', 'a', 0)),
    deletePhoto: async () => ok(undefined),
    createTimeline: async () => ok(opts.createdTimeline ?? timeline('tl')),
    updateTimeline: async () => ok(opts.createdTimeline ?? timeline('tl')),
    deleteTimeline: async () => ok(undefined),
    createMember: async () => ok(opts.createdMember ?? member('m-1', 'A')),
    updateMember: async () => ok(opts.createdMember ?? member('m-1', 'A')),
    deleteMember: async () => ok(undefined),
  }
  return {
    svc: createWriteService({
      readAlbums,
      albums: writes as unknown as AlbumWriteRepository,
      media: writes as unknown as MediaWriteRepository,
      timeline: writes as unknown as TimelineWriteRepository,
      members: writes as unknown as MemberWriteRepository,
      resolveDefaultOwner: opts.ownerResolutionError
        ? async () => { throw new Error('no user') }
        : async () => opts.ownerId ?? 'owner-1',
    }),
  }
}

describe('WriteService — Album', () => {
  it('createAlbum returns conflict when slug exists', async () => {
    const { svc } = makeSvc({ existingAlbum: album('taken') })
    const r = await svc.createAlbum({
      slug: 'taken', title: { en: 'X' }, cover: 'c', date: '2026-01-01',
      season: 'spring', category: 'school',
    } as never)
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error.code).toBe('conflict')
  })

  it('createAlbum surfaces transport error when owner resolution fails', async () => {
    const { svc } = makeSvc({ ownerResolutionError: true })
    const r = await svc.createAlbum({
      slug: 'fresh', title: { en: 'X' }, cover: 'c', date: '2026-01-01',
      season: 'spring', category: 'school',
    } as never)
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error.code).toBe('transport')
  })

  it('createAlbum succeeds when album is fresh and owner resolves', async () => {
    const { svc } = makeSvc({ ownerId: 'owner-X' })
    const r = await svc.createAlbum({
      slug: 'fresh', title: { en: 'X' }, cover: 'c', date: '2026-01-01',
      season: 'spring', category: 'school',
    } as never)
    expect(r.ok).toBe(true)
  })

  it('updateAlbum returns 404 when album missing', async () => {
    const { svc } = makeSvc({ existingAlbum: null })
    const r = await svc.updateAlbum('ghost', { title: { en: 'X' } })
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error.code).toBe('not_found')
  })

  it('deleteAlbum returns 404 when album missing', async () => {
    const { svc } = makeSvc({ existingAlbum: null })
    const r = await svc.deleteAlbum('ghost')
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error.code).toBe('not_found')
  })
})

describe('WriteService — Media', () => {
  it('createMedia returns 404 when album missing', async () => {
    const { svc } = makeSvc({ existingAlbum: null })
    const r = await svc.createMedia({
      albumSlug: 'ghost', idx: 0, src: 'p.jpg', caption: { en: 'X' },
      orientation: 'landscape', date: '2026-01-01',
    })
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error.code).toBe('not_found')
  })

  it('updateMedia returns 404 when album missing', async () => {
    const { svc } = makeSvc({ existingAlbum: null })
    const r = await svc.updateMedia('ghost', 0, { likes: 1 })
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error.code).toBe('not_found')
  })
})

describe('WriteService — Timeline', () => {
  it('createTimeline returns 404 when albumId is referenced but missing', async () => {
    const { svc } = makeSvc({ existingAlbum: null })
    const r = await svc.createTimeline({
      date: '2026-01-01', title: { en: 'X' }, description: { en: 'Y' },
      albumId: 'ghost', photo: 'p.jpg',
    })
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error.code).toBe('not_found')
  })

  it('createTimeline succeeds when albumId is omitted', async () => {
    const { svc } = makeSvc()
    const r = await svc.createTimeline({
      date: '2026-01-01', title: { en: 'X' }, description: { en: 'Y' },
      photo: 'p.jpg',
    })
    expect(r.ok).toBe(true)
  })
})

describe('WriteService — Member', () => {
  it('createMember forwards to repo', async () => {
    const { svc } = makeSvc({ createdMember: member('m-1', 'A') })
    const r = await svc.createMember({
      nameJa: 'A', name: { ja: 'A', id: 'A', en: 'A' }, avatar: 'a.jpg',
    })
    expect(r.ok).toBe(true)
  })

  it('updateMember forwards to repo', async () => {
    const { svc } = makeSvc({ createdMember: member('m-1', 'B') })
    const r = await svc.updateMember('m-1', { nameJa: 'B' })
    expect(r.ok).toBe(true)
  })
})