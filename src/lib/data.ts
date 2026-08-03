export type L10n = { ja: string; id: string; en: string }

export function pick<T extends L10n>(rec: T, locale: 'ja' | 'id' | 'en'): string {
  return rec[locale] ?? rec.ja
}

export type AlbumCategory = 'school' | 'festival' | 'study' | 'travel' | 'graduation'

export type Album = {
  slug: string
  title: L10n
  period: L10n
  count: number
  views: number
  cover: string
  /** ISO date — machine-sortable; `period` is the display label. */
  date: string
  season: 'spring' | 'summer' | 'autumn' | 'winter'
  category: AlbumCategory
}

export const ALBUMS: Album[] = [
  {
    slug: 'hanami-2026',
    title: { ja: '花見 2026', id: 'Hanami 2026', en: 'Hanami 2026' },
    period: { ja: '2026年4月', id: 'April 2026', en: 'April 2026' },
    count: 128,
    views: 1240,
    cover: 'https://images.unsplash.com/photo-1522383225653-ed111181a951?auto=format&fit=crop&w=900&q=85',
    date: '2026-04-05',
    season: 'spring',
    category: 'festival',
  },
  {
    slug: 'tanabata',
    title: { ja: '七夕祭り', id: 'Tanabata Festival', en: 'Tanabata Festival' },
    period: { ja: '2026年7月', id: 'Juli 2026', en: 'July 2026' },
    count: 112,
    views: 986,
    cover: 'https://images.unsplash.com/photo-1513159446162-54eb8bdaa79b?auto=format&fit=crop&w=900&q=85',
    date: '2026-07-23',
    season: 'summer',
    category: 'festival',
  },
  {
    slug: 'bounenkai-2025',
    title: { ja: '忘年会 2025', id: 'Bounenkai 2025', en: 'Bounenkai 2025' },
    period: { ja: '2025年12月', id: 'Desember 2025', en: 'December 2025' },
    count: 96,
    views: 754,
    cover: 'https://images.unsplash.com/photo-1482575832494-771f74bf6857?auto=format&fit=crop&w=900&q=85',
    date: '2025-12-20',
    season: 'winter',
    category: 'school',
  },
  {
    slug: 'sakura-trip',
    title: { ja: '桜の旅', id: 'Sakura Trip', en: 'Sakura Trip' },
    period: { ja: '2026年3月', id: 'Maret 2026', en: 'March 2026' },
    count: 428,
    views: 2130,
    cover: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=900&q=85',
    date: '2026-03-14',
    season: 'spring',
    category: 'travel',
  },
  {
    slug: 'study-session',
    title: { ja: '勉強会', id: 'Study Session', en: 'Study Session' },
    period: { ja: '2026年5月', id: 'Mei 2026', en: 'May 2026' },
    count: 184,
    views: 612,
    cover: 'https://images.unsplash.com/photo-1524178232363-1fb2b075b655?auto=format&fit=crop&w=900&q=85',
    date: '2026-05-11',
    season: 'spring',
    category: 'study',
  },
  {
    slug: 'jugyou',
    title: { ja: '授業の様子', id: 'Suasana Kelas', en: 'Classroom Moments' },
    period: { ja: '2025年9月', id: 'September 2025', en: 'September 2025' },
    count: 256,
    views: 1408,
    cover: 'https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&w=900&q=85',
    date: '2025-09-02',
    season: 'autumn',
    category: 'school',
  },
]

export type Photo = {
  src: string
  caption: L10n
  ago: L10n
  album: string
  tags: string[]
  likes: number
  /** Orientation hint — deterministic from the source URL.
      Optional so static photo literals aren't forced to declare it. */
  orientation?: 'landscape' | 'portrait'
}

/** Deterministic orientation hint from a URL — used to fill Photo.orientation. */
function deriveOrientation(src: string): 'landscape' | 'portrait' {
  let h = 0
  for (let i = 0; i < src.length; i++) h = (h * 31 + src.charCodeAt(i)) >>> 0
  return h % 10 < 6 ? 'landscape' : 'portrait'
}

export const RECENT_PHOTOS: Photo[] = ([
  {
    src: 'https://images.unsplash.com/photo-1522383225653-ed111181a951?auto=format&fit=crop&w=800&q=85',
    caption: { ja: '上野公園で一緒に', id: 'Bersama di Taman Ueno', en: 'Together at Ueno Park' },
    ago: { ja: '2時間前', id: '2 jam yang lalu', en: '2 hours ago' },
    album: 'hanami-2026',
    tags: ['Hanami', 'Travel'],
    likes: 42,
  },
  {
    src: 'https://images.unsplash.com/photo-1524178232363-1fb2b075b655?auto=format&fit=crop&w=800&q=85',
    caption: { ja: 'プレゼンの練習', id: 'Latihan Presentasi', en: 'Presentation Practice' },
    ago: { ja: '昨日', id: 'Kemarin', en: 'Yesterday' },
    album: 'study-session',
    tags: ['Belajar', 'Kelas'],
    likes: 28,
  },
  {
    src: 'https://images.unsplash.com/photo-1513159446162-54eb8bdaa79b?auto=format&fit=crop&w=800&q=85',
    caption: { ja: '夜祭り', id: 'Festival Malam', en: 'Night Festival' },
    ago: { ja: '2日前', id: '2 hari yang lalu', en: '2 days ago' },
    album: 'tanabata',
    tags: ['Festival', 'Jepang'],
    likes: 67,
  },
  {
    src: 'https://images.unsplash.com/photo-1482575832494-771f74bf6857?auto=format&fit=crop&w=800&q=85',
    caption: { ja: 'みんなで食事', id: 'Makan Bersama', en: 'Eating Together' },
    ago: { ja: '3日前', id: '3 hari yang lalu', en: '3 days ago' },
    album: 'bounenkai-2025',
    tags: ['Makan', 'Kelas'],
    likes: 51,
  },
  {
    src: 'https://images.unsplash.com/photo-1490806843957-31f4c9a91c65?auto=format&fit=crop&w=1200&q=85',
    caption: { ja: '富士山と鳥居', id: 'Gunung Fuji dan Torii', en: 'Mt. Fuji and Torii' },
    ago: { ja: '5日前', id: '5 hari yang lalu', en: '5 days ago' },
    album: 'sakura-trip',
    tags: ['Travel', 'Jepang'],
    likes: 118,
  },
  {
    src: 'https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&w=800&q=85',
    caption: { ja: '放課後の教室', id: 'Kelas sepulang sekolah', en: 'Classroom after school' },
    ago: { ja: '1週間前', id: '1 minggu yang lalu', en: '1 week ago' },
    album: 'jugyou',
    tags: ['Kelas', 'Belajar'],
    likes: 33,
  },
  {
    src: 'https://images.unsplash.com/photo-1500534623283-312aade485b7?auto=format&fit=crop&w=800&q=85',
    caption: { ja: '春の校庭', id: 'Halaman sekolah musim semi', en: 'Schoolyard in spring' },
    ago: { ja: '1週間前', id: '1 minggu yang lalu', en: '1 week ago' },
    album: 'hanami-2026',
    tags: ['Hanami', 'Kelas'],
    likes: 24,
  },
  {
    src: 'https://images.unsplash.com/photo-1512428559087-560fa5ceab42?auto=format&fit=crop&w=800&q=85',
    caption: { ja: '窓際の午後', id: 'Sore di tepi jendela', en: 'Afternoon by the window' },
    ago: { ja: '2週間前', id: '2 minggu yang lalu', en: '2 weeks ago' },
    album: 'jugyou',
    tags: ['Kelas', 'Cultural'],
    likes: 39,
  },
] as Array<Omit<Photo, 'orientation'>>).map((p) => ({ ...p, orientation: deriveOrientation(p.src) }))

export type UpcomingEvent = {
  day: string
  month: L10n
  title: L10n
  note: L10n
  photo: string
}

export const UPCOMING: UpcomingEvent[] = [
  {
    day: '23',
    month: { ja: '7月', id: 'Jul', en: 'Jul' },
    title: { ja: '七夕祭り', id: 'Tanabata Festival', en: 'Tanabata Festival' },
    note: { ja: 'クラスの年間行事', id: 'Kegiatan tahunan kelas', en: 'Annual class event' },
    photo: 'https://images.unsplash.com/photo-1513159446162-54eb8bdaa79b?auto=format&fit=crop&w=200&q=80',
  },
  {
    day: '15',
    month: { ja: '8月', id: 'Agu', en: 'Aug' },
    title: { ja: '夏の旅行', id: 'Summer Trip', en: 'Summer Trip' },
    note: { ja: '富士山へ行く', id: 'Perjalanan ke Gunung Fuji', en: 'Trip to Mt. Fuji' },
    photo: 'https://images.unsplash.com/photo-1490806843957-31f4c9a91c65?auto=format&fit=crop&w=200&q=80',
  },
  {
    day: '30',
    month: { ja: '10月', id: 'Okt', en: 'Oct' },
    title: { ja: 'ハロウィンパーティー', id: 'Halloween Party', en: 'Halloween Party' },
    note: { ja: '衣装と楽しみ', id: 'Kostum dan keseruan', en: 'Costumes and fun' },
    photo: 'https://images.unsplash.com/photo-1509062522246-3755977927d7?auto=format&fit=crop&w=200&q=80',
  },
  {
    day: '20',
    month: { ja: '12月', id: 'Des', en: 'Dec' },
    title: { ja: '忘年会', id: 'Bounenkai', en: 'Bounenkai' },
    note: { ja: '一年の締めくくり', id: 'Akhir tahun bersama', en: 'Closing the year together' },
    photo: 'https://images.unsplash.com/photo-1482575832494-771f74bf6857?auto=format&fit=crop&w=200&q=80',
  },
]

export const POPULAR_TAGS = ['Hanami', 'Festival', 'Belajar', 'Kelas', 'Travel', 'Makan', 'Cultural', 'Jepang']

export const TODAY_MEMORY = {
  src: 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&w=900&q=85',
  quoteJa: '思い出は、時間を超えて私たちをつなぐ。',
  caption: {
    ja: '思い出は時間を超えて私たちをつなぐ。🌸',
    id: 'Kenangan menghubungkan kita melampaui waktu. 🌸',
    en: 'Memories connect us across time. 🌸',
  },
  likes: 24,
}

export type TimelineEntry = {
  date: string
  title: L10n
  body: L10n
  photo?: string
  album?: string
}

export const TIMELINE: TimelineEntry[] = [
  {
    date: '2026-07-23',
    title: { ja: '七夕祭り', id: 'Tanabata Festival', en: 'Tanabata Festival' },
    body: {
      ja: '短冊に願いを書いて、竹に吊るした。',
      id: 'Menulis harapan di tanzaku, lalu digantung di bambu.',
      en: 'We wrote wishes on tanzaku and hung them on bamboo.',
    },
    photo: 'https://images.unsplash.com/photo-1513159446162-54eb8bdaa79b?auto=format&fit=crop&w=900&q=85',
    album: 'tanabata',
  },
  {
    date: '2026-05-11',
    title: { ja: '勉強会', id: 'Study Session', en: 'Study Session' },
    body: {
      ja: '試験前、図書室で夜まで残った。',
      id: 'Sebelum ujian, kami bertahan di perpustakaan sampai malam.',
      en: 'Before exams we stayed in the library until night.',
    },
    photo: 'https://images.unsplash.com/photo-1524178232363-1fb2b075b655?auto=format&fit=crop&w=900&q=85',
    album: 'study-session',
  },
  {
    date: '2026-04-05',
    title: { ja: '花見 2026', id: 'Hanami 2026', en: 'Hanami 2026' },
    body: {
      ja: 'クラスみんなで見た満開の桜。最高の一日だったね。',
      id: 'Sakura penuh mekar yang kita lihat bareng. Hari terbaik.',
      en: 'Cherry blossoms in full bloom, seen together. The best day.',
    },
    photo: 'https://images.unsplash.com/photo-1522383225653-ed111181a951?auto=format&fit=crop&w=900&q=85',
    album: 'hanami-2026',
  },
  {
    date: '2026-03-14',
    title: { ja: '桜の旅', id: 'Sakura Trip', en: 'Sakura Trip' },
    body: {
      ja: '三日間、朝から夜までずっと一緒だった。',
      id: 'Tiga hari bareng terus dari pagi sampai malam.',
      en: 'Three days together from morning until night.',
    },
    photo: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=900&q=85',
    album: 'sakura-trip',
  },
  {
    date: '2025-12-20',
    title: { ja: '忘年会 2025', id: 'Bounenkai 2025', en: 'Bounenkai 2025' },
    body: {
      ja: '教室を飾って、プレゼント交換をした夜。',
      id: 'Malam menghias kelas dan tukar kado.',
      en: 'The night we decorated the classroom and swapped gifts.',
    },
    photo: 'https://images.unsplash.com/photo-1482575832494-771f74bf6857?auto=format&fit=crop&w=900&q=85',
    album: 'bounenkai-2025',
  },
  {
    date: '2025-09-02',
    title: { ja: '授業の様子', id: 'Suasana Kelas', en: 'Classroom Moments' },
    body: {
      ja: '窓辺の風鈴が鳴るたび、誰かが顔を上げた。',
      id: 'Setiap fuurin di jendela berbunyi, ada yang menoleh.',
      en: 'Whenever the wind chime rang, someone looked up.',
    },
    photo: 'https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&w=900&q=85',
    album: 'jugyou',
  },
]

export const STATS = {
  members: 32,
  albums: 68,
  photos: 1248,
  year: '2025 – 2026',
}

/* ── Album photo generator (Mock Data) ───────────────────────────
   Deterministic: same slug → same photos, stable across renders.
   Lives in the mock module, not in business utilities. */

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

const PHOTO_CAPTIONS: L10n[] = [
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

const PHOTO_TAGS: string[] = ['Kelas', 'Festival', 'Belajar', 'Travel', 'Makan', 'Cultural']

/** Deterministic hash from a slug — stable across renders and processes. */
function slugHash(slug: string): number {
  let h = 0
  for (let i = 0; i < slug.length; i++) {
    h = (h * 31 + slug.charCodeAt(i)) >>> 0
  }
  return h
}

export function getAlbumPhotos(slug: string, count = 36): Photo[] {
  const seed = slugHash(slug)
  return Array.from({ length: count }, (_, i) => {
    const url = PHOTO_URLS[(seed + i) % PHOTO_URLS.length]
    const caption = PHOTO_CAPTIONS[(seed + i * 3) % PHOTO_CAPTIONS.length]
    const likes = 10 + ((seed + i * 7) % 140)
    const tagCount = 1 + ((seed + i) % 3)
    const tags = Array.from(
      { length: tagCount },
      (_, t) => PHOTO_TAGS[(seed + i * 5 + t * 11) % PHOTO_TAGS.length],
    )
    return {
      src: url,
      caption,
      ago: { ja: `${i + 1}日前`, id: `${i + 1} hari lalu`, en: `${i + 1} days ago` },
      album: slug,
      tags,
      likes,
      // Deterministic orientation — same URL always yields the same hint.
      orientation: deriveOrientation(url),
    }
  })
}

/* ── Photo lookup (Mock Data) ────────────────────────────────────
   photoId is the photo's index within getAlbumPhotos(slug). */

/** Resolve a photoId to a Photo, or undefined when out of range. */
export function getPhoto(slug: string, photoId: string): Photo | undefined {
  const photos = getAlbumPhotos(slug)
  const idx = Number(photoId)
  if (!Number.isInteger(idx) || idx < 0 || idx >= photos.length) return undefined
  return photos[idx]
}

/** Previous/next photo around photoId — undefined at the boundaries (no loop). */
export function getAdjacentPhotos(
  slug: string,
  photoId: string,
): { prev?: Photo; next?: Photo } {
  const photos = getAlbumPhotos(slug)
  const idx = Number(photoId)
  if (!Number.isInteger(idx) || idx < 0 || idx >= photos.length) return {}
  return {
    prev: idx > 0 ? photos[idx - 1] : undefined,
    next: idx < photos.length - 1 ? photos[idx + 1] : undefined,
  }
}

export const CURRENT_USER = {
  name: 'Rei',
  nameJa: 'Rei',
  avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=80&q=80',
  notifications: 3,
}

/* ── Members (Mock Data) ─────────────────────────────────────────
   Deterministic roster for the class — used by search only. */

export type Member = {
  id: string
  name: L10n
  role: L10n
  initial: string
  avatar: string
}

const MEMBER_AVATARS = [
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=96&q=80',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=96&q=80',
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=96&q=80',
  'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=96&q=80',
  'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=96&q=80',
  'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=96&q=80',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=96&q=80',
  'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=96&q=80',
]

const MEMBER_NAMES: { ja: string; id: string; en: string }[] = [
  { ja: '佐藤 はるか', id: 'Satou Haruka', en: 'Haruka Sato' },
  { ja: '鈴木 健太', id: 'Suzuki Kenta', en: 'Kenta Suzuki' },
  { ja: '高橋 美咲', id: 'Takahashi Misaki', en: 'Misaki Takahashi' },
  { ja: '田中 大輝', id: 'Tanaka Daiki', en: 'Daiki Tanaka' },
  { ja: '伊藤 さくら', id: 'Itou Sakura', en: 'Sakura Ito' },
  { ja: '渡辺 悠人', id: 'Watanabe Yuuto', en: 'Yuuto Watanabe' },
  { ja: '山本 結衣', id: 'Yamamoto Yui', en: 'Yui Yamamoto' },
  { ja: '中村 蓮', id: 'Nakamura Ren', en: 'Ren Nakamura' },
]

const MEMBER_ROLES: { ja: string; id: string; en: string }[] = [
  { ja: '学級委員長', id: 'Ketua Kelas', en: 'Class President' },
  { ja: '副学級委員長', id: 'Wakil Ketua', en: 'Vice President' },
  { ja: '書記', id: 'Sekretaris', en: 'Secretary' },
  { ja: '会計', id: 'Bendahara', en: 'Treasurer' },
  { ja: '文化委員', id: 'Koordinator Budaya', en: 'Culture Coordinator' },
  { ja: '体育委員', id: 'Koordinator Olahraga', en: 'Sports Coordinator' },
  { ja: '図書委員', id: 'Petugas Perpustakaan', en: 'Library Officer' },
  { ja: '広報委員', id: 'Petugas Humas', en: 'PR Officer' },
]

export const MEMBERS: Member[] = MEMBER_NAMES.map((name, i) => ({
  id: `member-${i + 1}`,
  name,
  role: MEMBER_ROLES[i % MEMBER_ROLES.length],
  initial: name.en.charAt(0),
  avatar: MEMBER_AVATARS[i % MEMBER_AVATARS.length],
}))

/* ── Photo link helper (Mock Data) ─────────────────────────────── */

/** Resolve a photo to its viewer route — photoId is its index in the album. */
export function getPhotoHref(photo: { album: string; src: string }): string {
  const photos = getAlbumPhotos(photo.album)
  const idx = photos.findIndex((p) => p.src === photo.src)
  return idx >= 0 ? `/albums/${photo.album}/photos/${idx}` : `/albums/${photo.album}`
}

/* ── Album tags (Mock Data) ────────────────────────────────────── */

/** Tags an album is searchable by — derived from its photos, in the data layer. */
export function getAlbumTags(slug: string): string[] {
  const tags = new Set<string>()
  for (const photo of getAlbumPhotos(slug, 12)) {
    for (const tag of photo.tags) tags.add(tag)
  }
  return [...tags]
}
