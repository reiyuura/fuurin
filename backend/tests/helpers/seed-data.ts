/**
 * Seed helpers for repository tests — create minimal rows directly via
 * Prisma (not the domain repos) so tests control exact fixture state.
 */

import type { PrismaClient } from '@prisma/client'
import type { AlbumCategory, AlbumSeason, AlbumVisibility } from '@prisma/client'

/** Create the seeded admin user. Returns its id. */
export async function seedOwner(prisma: PrismaClient, email = 'owner@test.local'): Promise<string> {
  const user = await prisma.user.upsert({
    where: { email },
    update: {},
    create: {
      email,
      name: 'Test Owner',
      role: 'admin',
      avatar: 'https://example.com/avatar.jpg',
    },
  })
  return user.id
}

export type SeedAlbumInput = {
  slug: string
  title?: { ja?: string; id?: string; en?: string }
  period?: { ja?: string; id?: string; en?: string }
  date?: string
  season?: AlbumSeason
  category?: AlbumCategory
  visibility?: AlbumVisibility
  cover?: string
  count?: number
  views?: number
  ownerId?: string
}

/** Create one published album with the given shape. Returns its slug. */
export async function seedAlbum(prisma: PrismaClient, input: SeedAlbumInput): Promise<string> {
  const ownerId = input.ownerId ?? (await seedOwner(prisma))
  await prisma.album.create({
    data: {
      slug: input.slug,
      title: (input.title ?? {}) as object,
      period: (input.period ?? {}) as object,
      date: input.date ?? '2026-01-01',
      season: input.season ?? 'spring',
      category: input.category ?? 'school',
      visibility: input.visibility ?? 'published',
      cover: input.cover ?? 'https://example.com/cover.jpg',
      count: input.count ?? 0,
      views: input.views ?? 0,
      ownerId,
      publishedAt: input.visibility === undefined || input.visibility === 'published' ? new Date() : null,
    },
  })
  return input.slug
}

/** Create `n` photos in an album with consecutive idx. Returns rows. */
export async function seedPhotos(
  prisma: PrismaClient,
  albumSlug: string,
  n: number,
  startIdx = 0,
): Promise<void> {
  await prisma.photo.createMany({
    data: Array.from({ length: n }, (_, i) => {
      const idx = startIdx + i
      return {
        albumSlug,
        idx,
        src: `https://example.com/photos/${albumSlug}/${idx}.jpg`,
        caption: { ja: `キャプション${idx}`, id: `Caption ${idx}`, en: `Caption ${idx}` } as object,
        ago: { ja: `${idx}日前`, id: `${idx} hari lalu`, en: `${idx} days ago` } as object,
        tags: [],
        likes: i * 3,
        orientation: 'landscape',
        date: '2026-01-01',
      }
    }),
  })
}
