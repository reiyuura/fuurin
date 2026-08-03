/**
 * Seed script — deterministic, idempotent.
 *
 * Run via `npx prisma db seed` (wired in package.json).
 *
 * Mirrors the frontend `MockApiClient` seed so the database reflects
 * what the frontend has been returning all along. Upserts on natural
 * keys keep the script safe to re-run.
 */

import { PrismaClient, Prisma } from '@prisma/client'

const prisma = new PrismaClient()

// ── Data pools (mirroring src/lib/data.ts + mock-api-client.ts) ───────

const PHOTO_URLS = [
  'https://images.unsplash.com/photo-1500534623283-312aade485b7?auto=format&fit=crop&w=800&q=85',
  'https://images.unsplash.com/photo-1512428559087-560fa5ceab42?auto=format&fit=crop&w=800&q=85',
  'https://images.unsplash.com/photo-1490806843957-31f4c9a91c65?auto=format&fit=crop&w=800&q=85',
  'https://images.unsplash.com/photo-1522383225653-ed111181a951?auto=format&fit=crop&w=800&q=85',
  'https://images.unsplash.com/photo-1513159446162-54eb8bdaa79b?auto=format&fit=crop&w=800&q=85',
  'https://images.unsplash.com/photo-1482575832494-771f74bf6857?auto=format&fit=crop&w=800&q=85',
  'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=800&q=85',
  'https://images.unsplash.com/photo-1524178232363-1fb2b075b655?auto=format&fit=crop&w=800&q=85',
  'https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&w=800&q=85',
  'https://images.unsplash.com/photo-1509062522246-3755977927d7?auto=format&fit=crop&w=800&q=85',
  'https://images.unsplash.com/photo-1519677100203-a0e668c92439?auto=format&fit=crop&w=800&q=85',
  'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&w=800&q=85',
  'https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=800&q=85',
  'https://images.unsplash.com/photo-1511795409834-ef04bbd61622?auto=format&fit=crop&w=800&q=85',
  'https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?auto=format&fit=crop&w=800&q=85',
]

const PHOTO_CAPTIONS = [
  { ja: '教室の窓辺で', id: 'Di tepi jendela kelas', en: 'By the classroom window' },
  { ja: 'みんなで昼休み', id: 'Istirahat siang bersama', en: 'Lunch break together' },
  { ja: '桜の下で', id: 'Di bawah pohon sakura', en: 'Under the sakura tree' },
  { ja: '発表の練習', id: 'Latihan presentasi', en: 'Presentation practice' },
  { ja: '屋台で遊ぶ', id: 'Bermain di stan', en: 'Having fun at the stalls' },
  { ja: '教室の後ろから', id: 'Dari belakang kelas', en: 'From the back of class' },
  { ja: '旅の途中で', id: 'Di tengah perjalanan', en: 'On the way' },
  { ja: '放課後のひととき', id: 'Saat setelah sekolah', en: 'After school moment' },
  { ja: 'みんなの笑顔', id: 'Senyum semua orang', en: 'Everyone smiling' },
  { ja: '夜景を見ながら', id: 'Menikmati lampu malam', en: 'Enjoying the night lights' },
  { ja: '記念写真', id: 'Foto kenang-kenangan', en: 'Group photo' },
  { ja: '小さな発見', id: 'Penemuan kecil', en: 'A little discovery' },
  { ja: '教室の飾り付け', id: 'Menghias kelas', en: 'Decorating the classroom' },
  { ja: '夕暮れの帰り道', id: 'Pulang saat senja', en: 'Walking home at dusk' },
]

const PHOTO_TAGS = ['Kelas', 'Festival', 'Belajar', 'Travel', 'Makan', 'Cultural']

const L10N = (ja: string, id: string, en: string) => ({ ja, id, en })

function slugHash(slug: string): number {
  let h = 0
  for (let i = 0; i < slug.length; i++) h = (h * 31 + slug.charCodeAt(i)) >>> 0
  return h
}

function deriveOrientation(seed: number): 'landscape' | 'portrait' {
  return seed % 10 < 6 ? 'landscape' : 'portrait'
}

// ── Seed operations ─────────────────────────────────────────────────

async function seedUser(): Promise<string> {
  const u = await prisma.user.upsert({
    where: { email: 'rei@fuurin.id' },
    update: {},
    create: {
      email: 'rei@fuurin.id',
      name: 'Rei',
      role: 'admin',
      avatar: 'https://images.unsplash.com/photo-1500534623283-312aade485b7?auto=format&fit=crop&w=256&q=85',
      passwordHash: null, // populated in Sprint 20
    },
  })
  return u.id
}

async function seedAlbum(args: {
  slug: string
  title: string
  period: string
  date: string
  season: 'spring' | 'summer' | 'autumn' | 'winter'
  category: 'school' | 'festival' | 'study' | 'travel' | 'graduation'
  ownerId: string
  count: number
}) {
  await prisma.album.upsert({
    where: { slug: args.slug },
    update: {
      count: args.count,
      views: 120,
    },
    create: {
      slug: args.slug,
      title: L10N(args.title, args.title, args.title),
      period: L10N(args.period, args.period, args.period),
      count: args.count,
      views: 120,
      cover: PHOTO_URLS[0]!,
      date: args.date,
      season: args.season,
      category: args.category,
      visibility: 'published',
      ownerId: args.ownerId,
      publishedAt: new Date(args.date),
    },
  })
}

async function seedPhoto(albumSlug: string, idx: number, date: string) {
  const seed = slugHash(albumSlug)
  const url = PHOTO_URLS[(seed + idx) % PHOTO_URLS.length]!
  const caption = PHOTO_CAPTIONS[(seed + idx * 3) % PHOTO_CAPTIONS.length]!
  const likes = 10 + ((seed + idx * 7) % 140)
  const tagCount = 1 + ((seed + idx) % 3)
  const tags = Array.from(
    { length: tagCount },
    (_, t) => PHOTO_TAGS[(seed + idx * 5 + t * 11) % PHOTO_TAGS.length]!,
  )

  await prisma.photo.upsert({
    where: { albumSlug_idx: { albumSlug, idx } },
    update: { tags, likes },
    create: {
      albumSlug,
      idx,
      src: url,
      caption: caption as unknown as Prisma.InputJsonValue,
      ago: L10N(`${idx + 1}日前`, `${idx + 1} hari lalu`, `${idx + 1} days ago`) as unknown as Prisma.InputJsonValue,
      tags,
      likes,
      orientation: deriveOrientation(seed + idx),
      date,
    },
  })
}

async function seedTimeline(albumSlugs: string[]) {
  const entries: Array<{ date: string; title: [string, string, string]; desc: [string, string, string]; albumIdx: number; photo: string }> = [
    { date: '2026-04-01', title: ['新学期スタート', 'Tahun ajaran baru dimulai', 'New school year begins'], desc: ['新しい教室', 'Ruang kelas baru', 'New classroom'], albumIdx: 0, photo: PHOTO_URLS[0]! },
    { date: '2026-04-05', title: ['桜が満開', 'Sakura mekar penuh', 'Cherry blossoms in full bloom'], desc: ['公園でお花見', 'Hanami di taman', 'Hanami at the park'], albumIdx: 0, photo: PHOTO_URLS[2]! },
    { date: '2026-05-10', title: ['文化祭', 'Festival budaya', 'Cultural festival'], desc: ['出し物の準備', 'Persiapan stan', 'Booth preparation'], albumIdx: 1, photo: PHOTO_URLS[4]! },
    { date: '2026-05-12', title: ['文化祭当日', 'Hari festival', 'Festival day'], desc: ['クラスの出し物', 'Stan kelas', 'Class booth'], albumIdx: 1, photo: PHOTO_URLS[5]! },
    { date: '2026-06-01', title: ['梅雨入り', 'Musim hujan', 'Rainy season begins'], desc: ['教室で過ごす昼休み', 'Istirahat siang di kelas', 'Lunch break in class'], albumIdx: -1, photo: PHOTO_URLS[7]! },
    { date: '2026-07-07', title: ['七夕', 'Tanabata', 'Tanabata'], desc: ['笹に短冊', 'Menulis愿望 di bambu', 'Wishes on bamboo'], albumIdx: -1, photo: PHOTO_URLS[10]! },
  ]

  for (const e of entries) {
    // Idempotent on (date, title.en).
    const existing = await prisma.timelineEntry.findFirst({
      where: { date: e.date, photo: e.photo },
    })
    if (existing) continue
    await prisma.timelineEntry.create({
      data: {
        date: e.date,
        title: L10N(e.title[0], e.title[1], e.title[2]) as unknown as Prisma.InputJsonValue,
        description: L10N(e.desc[0], e.desc[1], e.desc[2]) as unknown as Prisma.InputJsonValue,
        albumId: e.albumIdx >= 0 ? albumSlugs[e.albumIdx] ?? null : null,
        categoryTag: e.albumIdx < 0 ? 'kelas' : null,
        photo: e.photo,
      },
    })
  }
}

async function seedMembers() {
  const members: Array<{ id: string; nameJa: string; name: [string, string, string]; role: [string, string, string]; avatar: string }> = [
    { id: 'm-rei', nameJa: '麗', name: ['麗', 'Rei', 'Rei'], role: ['委員長', 'Ketua kelas', 'Class President'], avatar: PHOTO_URLS[0]! },
    { id: 'm-hana', nameJa: '花', name: ['花', 'Hana', 'Hana'], role: ['副委員長', 'Wakil ketua', 'Vice President'], avatar: PHOTO_URLS[2]! },
    { id: 'm-yuki', nameJa: '雪', name: ['雪', 'Yuki', 'Yuki'], role: ['書記', 'Sekretaris', 'Secretary'], avatar: PHOTO_URLS[4]! },
    { id: 'm-sora', nameJa: '空', name: ['空', 'Sora', 'Sora'], role: ['会計', 'Bendahara', 'Treasurer'], avatar: PHOTO_URLS[6]! },
    { id: 'm-nagi', nameJa: '凪', name: ['凪', 'Nagi', 'Nagi'], role: ['委員', 'Anggota', 'Member'], avatar: PHOTO_URLS[8]! },
    { id: 'm-tsubaki', nameJa: '椿', name: ['椿', 'Tsubaki', 'Tsubaki'], role: ['委員', 'Anggota', 'Member'], avatar: PHOTO_URLS[10]! },
  ]
  for (const m of members) {
    await prisma.member.upsert({
      where: { id: m.id },
      update: {},
      create: {
        id: m.id,
        nameJa: m.nameJa,
        name: L10N(m.name[0], m.name[1], m.name[2]) as unknown as Prisma.InputJsonValue,
        role: L10N(m.role[0], m.role[1], m.role[2]) as unknown as Prisma.InputJsonValue,
        avatar: m.avatar,
      },
    })
  }
}

async function seedDraft(albumSlug: string) {
  await prisma.albumDraft.upsert({
    where: { slug: `${albumSlug}-draft` },
    update: {},
    create: {
      slug: `${albumSlug}-draft`,
      title: `${albumSlug} (draft)`,
      description: 'Sample draft for the editor.',
      date: '2026-08-15',
      location: 'Sample location',
      visibility: 'draft',
      coverMediaId: null,
      photoIds: [],
      albumId: albumSlug,
    },
  })
}

// ── Entry point ─────────────────────────────────────────────────────

async function main() {
  console.log('Seeding…')
  const ownerId = await seedUser()
  const albums = [
    { slug: 'hanami-2026', title: 'Hanami 2026', period: 'Spring 2026', date: '2026-04-05', season: 'spring' as const, category: 'festival' as const, count: 10 },
    { slug: 'tanabata-2026', title: 'Tanabata 2026', period: 'Summer 2026', date: '2026-07-07', season: 'summer' as const, category: 'festival' as const, count: 10 },
  ]
  for (const a of albums) {
    await seedAlbum({ ...a, ownerId })
    for (let i = 0; i < a.count; i++) {
      await seedPhoto(a.slug, i, a.date)
    }
  }
  await seedTimeline(albums.map((a) => a.slug))
  await seedMembers()
  await seedDraft('hanami-2026')
  console.log('Done.')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })