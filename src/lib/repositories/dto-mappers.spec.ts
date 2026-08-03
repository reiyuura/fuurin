/**
 * DTO → Domain mapper tests — the read-side contract between the
 * backend wire shape and the frontend domain model.
 */

import { describe, expect, it } from 'vitest'
import {
  toAlbum,
  toMediaItem,
  toMember,
  toPhoto,
  toTimelineEntry,
} from '@/lib/repositories/dto-mappers'
import type { AlbumDto, MediaDto, MemberDto, PhotoDto, TimelineEntryDto } from '@/types/repository-dtos'

const albumDto: AlbumDto = {
  slug: 'hanami-2026',
  title: { ja: '花見 2026', id: 'Hanami 2026', en: 'Hanami 2026' },
  period: { ja: '2026年4月', id: 'April 2026', en: 'April 2026' },
  count: 128,
  views: 1240,
  cover: 'https://example.com/cover.jpg',
  date: '2026-04-05',
  season: 'spring',
  category: 'festival',
}

const photoDto: PhotoDto = {
  src: 'https://example.com/p1.jpg',
  caption: { ja: '教室の窓辺で', id: 'Di tepi jendela', en: 'By the window' },
  ago: { ja: '2時間前', id: '2 jam lalu', en: '2 hours ago' },
  album: 'hanami-2026',
  tags: ['Kelas'],
  likes: 42,
  orientation: 'landscape',
  idx: 3,
  date: '2026-04-05',
}

const mediaDto: MediaDto = {
  id: 'hanami-2026:3',
  albumSlug: 'hanami-2026',
  idx: 3,
  src: photoDto.src,
  caption: photoDto.caption,
  ago: photoDto.ago,
  tags: photoDto.tags,
  likes: photoDto.likes,
  orientation: 'landscape',
  date: '2026-04-05',
}

const memberDto: MemberDto = {
  id: 'm-1',
  name: { ja: '佐藤 はるか', id: 'Satou Haruka', en: 'Haruka Sato' },
  nameJa: '佐藤 はるか',
  role: { ja: '学級委員長', id: 'Ketua Kelas', en: 'Class President' },
  avatar: 'https://example.com/m.jpg',
}

const timelineDto: TimelineEntryDto = {
  id: 'tl-1',
  date: '2026-04-05',
  title: { ja: '花見', id: 'Hanami', en: 'Hanami' },
  description: { ja: '桜', id: 'Sakura', en: 'Sakura' },
  tag: 'hanami-2026',
  photo: 'https://example.com/t.jpg',
}

describe('dto-mappers', () => {
  it('toAlbum maps every field and normalizes string L10n to a triplet', () => {
    const album = toAlbum(albumDto)
    expect(album.slug).toBe('hanami-2026')
    expect(album.title.ja).toBe('花見 2026')
    expect(album.title.en).toBe('Hanami 2026')
    expect(album.season).toBe('spring')
    expect(album.category).toBe('festival')
    expect(album.count).toBe(128)
    expect(album.views).toBe(1240)
    expect(album.date).toBe('2026-04-05')

    const flat = toAlbum({ ...albumDto, title: 'Plain', period: 'Period' })
    expect(flat.title).toEqual({ ja: 'Plain', id: 'Plain', en: 'Plain' })
  })

  it('toPhoto maps photo fields', () => {
    const photo = toPhoto(photoDto)
    expect(photo.src).toBe(photoDto.src)
    expect(photo.caption.id).toBe('Di tepi jendela')
    expect(photo.album).toBe('hanami-2026')
    expect(photo.tags).toEqual(['Kelas'])
    expect(photo.orientation).toBe('landscape')
  })

  it('toMediaItem synthesizes id when absent', () => {
    const item = toMediaItem({ ...mediaDto, id: undefined })
    expect(item.id).toBe('hanami-2026:3')
    expect(item.albumSlug).toBe('hanami-2026')
    expect(item.caption.ja).toBe('教室の窓辺で')
  })

  it('toMember derives initial from nameJa', () => {
    const member = toMember(memberDto)
    expect(member.id).toBe('m-1')
    expect(member.initial).toBe('佐')
    expect(member.name.en).toBe('Haruka Sato')
    expect(member.role.id).toBe('Ketua Kelas')
  })

  it('toTimelineEntry maps description→body and tag→album', () => {
    const entry = toTimelineEntry(timelineDto)
    expect(entry.date).toBe('2026-04-05')
    expect(entry.body.ja).toBe('桜')
    expect(entry.album).toBe('hanami-2026')
  })
})