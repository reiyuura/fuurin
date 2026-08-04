'use client'

import { createContext, useCallback, useContext, useEffect, useState } from 'react'

export type Locale = 'ja' | 'id' | 'en'

export const LOCALES: { code: Locale; label: string; flag: string }[] = [
  { code: 'ja', label: '日本語', flag: '🇯🇵' },
  { code: 'id', label: 'Indonesia', flag: '🇮🇩' },
  { code: 'en', label: 'English', flag: '🇬🇧' },
]

const DICT = {
  'nav.home': { ja: 'ホーム', id: 'Beranda', en: 'Home' },
  'nav.albums': { ja: 'アルバム', id: 'Album', en: 'Albums' },
  'nav.timeline': { ja: 'タイムライン', id: 'Timeline', en: 'Timeline' },
  'nav.about': { ja: 'クラスについて', id: 'Tentang Kelas', en: 'About the Class' },
  'nav.favorites': { ja: 'お気に入り', id: 'Favorit', en: 'Favorites' },

  'hero.eyebrow': { ja: 'FUURIN NO CLASS', id: 'FUURIN NO CLASS', en: 'FUURIN NO CLASS' },
  'hero.title': { ja: '風鈴のクラス', id: '風鈴のクラス', en: '風鈴のクラス' },
  'hero.leadJa': { ja: '一緒に学び、笑い、成長した日々の記憶。', id: '一緒に学び、笑い、成長した日々の記憶。', en: '一緒に学び、笑い、成長した日々の記憶。' },
  'hero.lead': {
    ja: '教室の窓から差し込む午後の光まで、ぜんぶ残してある。',
    id: 'Kenangan hari-hari kita belajar, berteman, dan tumbuh bersama.',
    en: 'Memories of the days we learned, laughed, and grew up together.',
  },
  'hero.cta': { ja: 'ギャラリーを見る', id: 'Lihat Galeri', en: 'View Gallery' },

  'stats.photos': { ja: '写真', id: 'Foto', en: 'Photos' },
  'stats.albums': { ja: 'アルバム', id: 'Album', en: 'Albums' },
  'stats.members': { ja: 'メンバー', id: 'Anggota', en: 'Members' },
  'stats.year': { ja: '学年', id: 'Tahun Ajaran', en: 'School Year' },

  'albums.heading': { ja: '人気のアルバム', id: 'Album Populer', en: 'Popular Albums' },
  'albums.all': { ja: 'すべてのアルバムを見る', id: 'Lihat semua album', en: 'View all albums' },
  'albums.pageTitle': { ja: 'アルバム', id: 'Album', en: 'Albums' },
  'albums.pageLead': {
    ja: '季節ごとに残した思い出のまとまり。',
    id: 'Kumpulan kenangan yang tersimpan per musim.',
    en: 'Collections of memories kept season by season.',
  },
  'albums.photoUnit': { ja: '枚', id: ' foto', en: ' photos' },
  'albums.back': { ja: 'アルバム一覧へ戻る', id: 'Kembali ke daftar album', en: 'Back to all albums' },

  'recent.heading': { ja: '最近の写真', id: 'Foto Terbaru', en: 'Recent Photos' },
  'recent.all': { ja: 'すべて見る', id: 'Lihat semua', en: 'View all' },

  'today.label': { ja: '今日の思い出', id: 'Kenangan Hari Ini', en: "Today's Memory" },
  'today.shuffle': { ja: 'ランダムで見る', id: 'Lihat acak', en: 'Shuffle' },

  'timeline.pageTitle': { ja: 'タイムライン', id: 'Timeline', en: 'Timeline' },
  'timeline.pageLead': {
    ja: '一年間の歩みを、順番に。',
    id: 'Perjalanan satu tahun, berurutan.',
    en: 'A year of moments, in order.',
  },
  'timeline.viewAlbum': { ja: 'アルバムを見る', id: 'Lihat album', en: 'View album' },

  'about.pageTitle': { ja: 'クラスについて', id: 'Tentang Kelas', en: 'About the Class' },
  'about.pageLead': {
    ja: '風鈴のクラスは、風の音がよく聞こえる二階の教室から始まった。',
    id: 'Kelas Fuurin dimulai dari ruang lantai dua yang selalu kedengaran suara angin.',
    en: 'Fuurin Class began in a second-floor room where the wind was always audible.',
  },
  'about.storyTitle': { ja: 'この教室のこと', id: 'Tentang ruang ini', en: 'About this room' },
  'about.story': {
    ja: '窓辺に下がった風鈴が鳴るたび、誰かが顔を上げた。板張りの床、午後の光、抹茶みたいな緑の黒板。特別な場所ではないけれど、私たちにとっては全部だった。',
    id: 'Setiap fuurin di tepi jendela berbunyi, ada yang menoleh. Lantai kayu, cahaya sore, papan tulis hijau matcha. Bukan tempat istimewa, tapi bagi kami itu segalanya.',
    en: 'Whenever the wind chime by the window rang, someone looked up. Wooden floors, afternoon light, a matcha-green chalkboard. Not a special place, but to us it was everything.',
  },
  'about.valuesTitle': { ja: '大切にしていたこと', id: 'Yang kami jaga', en: 'What we held onto' },
  'about.v1': { ja: '誰も置いていかない', id: 'Tidak meninggalkan siapa pun', en: 'Leave no one behind' },
  'about.v1d': { ja: 'わからない人がいたら、みんなで戻った。', id: 'Kalau ada yang belum paham, kami mundur bareng.', en: 'If someone was lost, we all went back.' },
  'about.v2': { ja: '笑って終わる', id: 'Selesai dengan tawa', en: 'End with a laugh' },
  'about.v2d': { ja: 'どんな日も最後は冗談で締めた。', id: 'Hari apa pun, ditutup dengan lelucon.', en: 'However the day went, we closed it with a joke.' },
  'about.v3': { ja: '残しておく', id: 'Selalu disimpan', en: 'Keep a record' },
  'about.v3d': { ja: 'だからこのアルバムがある。', id: 'Karena itu album ini ada.', en: 'That is why this album exists.' },

  'favorites.pageTitle': { ja: 'お気に入り', id: 'Favorit', en: 'Favorites' },
  'favorites.pageLead': {
    ja: '何度も見返してしまう写真。',
    id: 'Foto yang selalu dibuka ulang.',
    en: 'The photos we keep coming back to.',
  },
  'favorites.empty': {
    ja: 'まだお気に入りはありません。写真のハートを押してみて。',
    id: 'Belum ada favorit. Tekan ikon hati di foto.',
    en: 'No favorites yet. Tap the heart on a photo.',
  },
  'favorites.count': { ja: '枚のお気に入り', id: ' foto favorit', en: ' favorites' },
  'favorites.remove': { ja: 'お気に入りから外す', id: 'Hapus dari favorit', en: 'Remove from favorites' },
  'favorites.add': { ja: 'お気に入りに追加', id: 'Tambah ke favorit', en: 'Add to favorites' },

  'footer.tagline': {
    ja: '春の午後にひらく、古いアルバム。',
    id: 'Album lama yang dibuka pada sore musim semi.',
    en: 'An old album opened on a spring afternoon.',
  },
  'footer.explore': { ja: 'めぐる', id: 'Jelajahi', en: 'Explore' },
  'footer.rights': { ja: 'クラスの記録', id: 'Arsip kelas', en: 'Class archive' },

  'theme.toggle': { ja: 'テーマ切り替え', id: 'Ganti tema', en: 'Toggle theme' },
  'lang.switch': { ja: '言語', id: 'Bahasa', en: 'Language' },
  'menu.open': { ja: 'メニュー', id: 'Menu', en: 'Menu' },

  'search.placeholder': {
    ja: '写真・アルバム・メンバーを検索...',
    id: 'Cari foto, album, anggota...',
    en: 'Search photos, albums, members...',
  },
  'search.short': { ja: '写真・アルバムを検索...', id: 'Cari foto, album...', en: 'Search photos, albums...' },
  'search.open': { ja: '検索を開く', id: 'Buka pencarian', en: 'Open search' },
  'search.close': { ja: '検索を閉じる', id: 'Tutup pencarian', en: 'Close search' },
  'search.empty': { ja: '結果が見つかりません。', id: 'Tidak ada hasil.', en: 'No results found.' },
  'search.hintAlbums': { ja: 'アルバム', id: 'Album', en: 'Albums' },
  'search.hintPhotos': { ja: '写真', id: 'Foto', en: 'Photos' },
  'search.hintTags': { ja: 'タグ', id: 'Tag', en: 'Tags' },
  'search.hintMembers': { ja: 'メンバー', id: 'Anggota', en: 'Members' },
  'search.hintTimeline': { ja: 'タイムライン', id: 'Timeline', en: 'Timeline' },
  'search.history': { ja: '最近の検索', id: 'Pencarian Terakhir', en: 'Recent Searches' },
  'search.clearAll': { ja: 'すべて消去', id: 'Hapus Semua', en: 'Clear All' },
  'search.emptyTitle': { ja: '結果が見つかりません', id: 'Tidak ada hasil ditemukan', en: 'No results found' },
  'search.emptyDesc': {
    ja: '別のキーワードで試してみてください。',
    id: 'Coba kata kunci lain atau reset filter.',
    en: 'Try a different keyword or reset the filters.',
  },
  'search.reset': { ja: 'リセット', id: 'Reset', en: 'Reset' },
  'search.removeHistory': { ja: '履歴を削除', id: 'Hapus riwayat', en: 'Remove from history' },
  'search.newest': { ja: '新しい順', id: 'Terbaru', en: 'Newest' },
  'search.oldest': { ja: '古い順', id: 'Terlama', en: 'Oldest' },
  'search.popular': { ja: '人気順', id: 'Populer', en: 'Popular' },
  'search.landscape': { ja: '横長', id: 'Landscape', en: 'Landscape' },
  'search.portrait': { ja: '縦長', id: 'Portrait', en: 'Portrait' },
  'search.favOnly': { ja: 'お気に入りのみ', id: 'Hanya Favorit', en: 'Favorites only' },
  'search.noHistory': { ja: '検索履歴はありません', id: 'Belum ada riwayat', en: 'No recent searches' },

  'media.title': { ja: 'メディアライブラリ', id: 'Pustaka Media', en: 'Media Library' },
  'media.lead': {
    ja: 'クラスのすべての写真を一箇所で。',
    id: 'Semua foto kelas dalam satu tempat.',
    en: 'Every photo from the class in one place.',
  },
  'media.searchPlaceholder': { ja: 'キャプション・タグ・アルバムを検索', id: 'Cari caption, tag, album…', en: 'Search caption, tag, album…' },
  'media.albums': { ja: 'アルバム', id: 'Album', en: 'Albums' },
  'media.allAlbums': { ja: 'すべてのアルバム', id: 'Semua album', en: 'All albums' },
  'media.selection.toggle': { ja: '選択モード', id: 'Mode Pemilihan', en: 'Selection Mode' },
  'media.selection.count': {
    ja: '{n}枚選択中',
    id: '{n} dipilih',
    en: '{n} selected',
  },
  'media.selection.clear': { ja: 'クリア', id: 'Hapus', en: 'Clear' },
  'media.selection.cancel': { ja: 'キャンセル', id: 'Batal', en: 'Cancel' },
  'media.action.favorite': { ja: 'お気に入りに追加', id: 'Tambah ke favorit', en: 'Add to favorites' },
  'media.action.tag': { ja: 'タグを追加', id: 'Tambah tag', en: 'Add tag' },
  'media.action.delete': { ja: '削除', id: 'Hapus', en: 'Delete' },
  'media.action.open': { ja: '開く', id: 'Buka', en: 'Open' },
  'media.confirm.delete': {
    ja: '{n}枚の写真を削除しますか？',
    id: 'Hapus {n} foto?',
    en: 'Delete {n} photos?',
  },
  'media.empty.title': {
    ja: 'メディアが見つかりません',
    id: 'Tidak ada media yang cocok',
    en: 'No matching media',
  },
  'media.empty.desc': {
    ja: '別のキーワードやフィルターをお試しください。',
    id: 'Coba kata kunci atau filter lain.',
    en: 'Try a different keyword or filter.',
  },
  'media.sort.newest': { ja: '新しい順', id: 'Terbaru', en: 'Newest' },
  'media.sort.oldest': { ja: '古い順', id: 'Terlama', en: 'Oldest' },
  'media.sort.name-az': { ja: '名前 A–Z', id: 'Nama A–Z', en: 'Name A–Z' },
  'media.sort.name-za': { ja: '名前 Z–A', id: 'Nama Z–A', en: 'Name Z–A' },
  'media.orient': { ja: '向き', id: 'Orientasi', en: 'Orientation' },

  'notif.label': { ja: '通知', id: 'Notifikasi', en: 'Notifications' },
  'notif.title': { ja: '新しいお知らせ', id: 'Pemberitahuan baru', en: 'New notifications' },
  'notif.n1': { ja: '新しい写真が12枚追加されました。', id: '12 foto baru ditambahkan.', en: '12 new photos were added.' },
  'notif.n2': { ja: '七夕祭りのアルバムが公開されました。', id: 'Album Tanabata Festival sudah terbit.', en: 'The Tanabata Festival album is live.' },
  'notif.n3': { ja: 'あなたの写真が24件お気に入りされました。', id: 'Fotomu difavoritkan 24 kali.', en: 'Your photo was favorited 24 times.' },
  'notif.empty': { ja: 'お知らせはありません。', id: 'Tidak ada pemberitahuan.', en: 'No notifications.' },

  'account.menu': { ja: 'アカウント', id: 'Akun', en: 'Account' },
  'account.profile': { ja: 'プロフィール', id: 'Profil', en: 'Profile' },
  'account.favorites': { ja: 'お気に入り', id: 'Favorit', en: 'Favorites' },
  'account.settings': { ja: '設定', id: 'Pengaturan', en: 'Settings' },

  'greet.morning': { ja: 'おはよう、Reiさん🌸', id: 'Selamat pagi, Rei🌸', en: 'Good morning, Rei🌸' },
  'greet.day': { ja: 'こんにちは、Reiさん🌸', id: 'Selamat siang, Rei🌸', en: 'Good afternoon, Rei🌸' },
  'greet.evening': { ja: 'こんばんは、Reiさん🌸', id: 'Selamat malam, Rei🌸', en: 'Good evening, Rei🌸' },
  'greet.welcome': {
    ja: '風鈴のクラスへおかえりなさい',
    id: 'Selamat datang kembali di Fuurin no Class',
    en: 'Welcome back to Fuurin no Class',
  },
  'greet.welcomeShort': { ja: 'おかえりなさい！', id: 'Selamat datang kembali!', en: 'Welcome back!' },
  'greet.sub': {
    ja: '今日も素敵な思い出を一緒に振り返りましょう。',
    id: 'Yuk, kenang lagi momen indah kita hari ini.',
    en: "Let's look back on our best memories today.",
  },
  'greet.ctaAlbum': { ja: 'アルバムを見る', id: 'Lihat Album', en: 'View Albums' },
  'greet.ctaTimeline': { ja: 'タイムライン', id: 'Timeline', en: 'Timeline' },

  'quick.latest': { ja: '最新のアルバム', id: 'Album Terbaru', en: 'Latest Album' },
  'quick.latestSub': { ja: '新しいコレクションを見る', id: 'Lihat koleksi terbaru', en: 'See the newest collection' },
  'quick.today': { ja: '今日の思い出', id: 'Memori Hari Ini', en: "Today's Memory" },
  'quick.todaySub': { ja: 'ランダムな特別な一枚', id: 'Foto acak spesial', en: 'A special random photo' },
  'quick.timeline': { ja: 'タイムライン', id: 'Timeline', en: 'Timeline' },
  'quick.timelineSub': { ja: 'クラスの歩み', id: 'Perjalanan kelas kita', en: 'Our class journey' },
  'quick.search': { ja: '写真を検索', id: 'Cari Foto', en: 'Search Photos' },
  'quick.searchSub': { ja: '思い出をさがす', id: 'Cari kenanganmu', en: 'Find your memories' },

  'albums.featured': { ja: '注目のアルバム', id: 'Album Pilihan', en: 'Featured Albums' },
  'albums.viewAll': { ja: 'すべて見る', id: 'Lihat semua', en: 'View all' },
  'albums.views': { ja: '回閲覧', id: ' dilihat', en: ' views' },

  'recent.latest': { ja: '最近の思い出', id: 'Memori Terbaru', en: 'Recent Memories' },

  'upcoming.heading': { ja: '今後の予定', id: 'Timeline Mendatang', en: 'Upcoming Timeline' },
  'tags.heading': { ja: '人気のタグ', id: 'Tag Populer', en: 'Popular Tags' },
  'today.heading': { ja: '今日の思い出', id: 'Memori Hari Ini', en: "Today's Memory" },
  'today.likes': { ja: 'いいね', id: 'suka', en: 'likes' },

  'footer.about': {
    ja: '私たちの大切な思い出をいつまでも残す場所。',
    id: 'Tempat di mana kenangan indah kita disimpan selamanya.',
    en: 'Where our precious memories are kept forever.',
  },
  'footer.nav': { ja: 'ナビゲーション', id: 'Navigasi', en: 'Navigation' },
  'footer.help': { ja: 'ヘルプ', id: 'Bantuan', en: 'Help' },
  'footer.helpHow': { ja: '使い方', id: 'Cara Menggunakan', en: 'How to Use' },
  'footer.helpPrivacy': { ja: 'プライバシーポリシー', id: 'Kebijakan Privasi', en: 'Privacy Policy' },
  'footer.helpContact': { ja: 'お問い合わせ', id: 'Hubungi Kami', en: 'Contact Us' },
  'footer.helpFaq': { ja: 'よくある質問', id: 'FAQ', en: 'FAQ' },
  'footer.classTitle': { ja: 'クラスについて', id: 'Tentang Kelas', en: 'About the Class' },
  'footer.classTeacher': { ja: '先生', id: 'Guru', en: 'Teacher' },
  'footer.classMembers': { ja: 'メンバー', id: 'Anggota', en: 'Members' },
  'footer.classRules': { ja: 'クラスのルール', id: 'Aturan Kelas', en: 'Class Rules' },
  'footer.classGallery': { ja: 'ギャラリー', id: 'Galeri', en: 'Gallery' },
  'footer.madeWith': {
    ja: '私たちみんなの思い出のために ❤️ をこめて',
    id: 'Dibuat dengan ❤️ untuk kenangan kita semua.',
    en: 'Made with ❤️ for all our memories.',
  },

  'tab.home': { ja: 'ホーム', id: 'Home', en: 'Home' },
  'tab.albums': { ja: 'アルバム', id: 'Albums', en: 'Albums' },
  'tab.timeline': { ja: 'タイムライン', id: 'Timeline', en: 'Timeline' },
  'tab.search': { ja: '検索', id: 'Search', en: 'Search' },
  'tab.profile': { ja: 'プロフィール', id: 'Profile', en: 'Profile' },
  'tab.members': { ja: 'メンバー', id: 'Anggota', en: 'Members' },
} as const

export type DictKey = keyof typeof DICT

const LocaleCtx = createContext<{
  locale: Locale
  setLocale: (l: Locale) => void
  t: (k: DictKey) => string
}>({ locale: 'id', setLocale: () => {}, t: (k) => DICT[k].id })

export function LocaleProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>('id')

  useEffect(() => {
    const saved = window.localStorage.getItem('fuurin-locale') as Locale | null
    if (saved && LOCALES.some((l) => l.code === saved)) setLocaleState(saved)
  }, [])

  const setLocale = useCallback((l: Locale) => {
    setLocaleState(l)
    window.localStorage.setItem('fuurin-locale', l)
    document.documentElement.lang = l
  }, [])

  const t = useCallback((k: DictKey) => DICT[k][locale] ?? DICT[k].ja, [locale])

  return <LocaleCtx.Provider value={{ locale, setLocale, t }}>{children}</LocaleCtx.Provider>
}

export function useLocale() {
  return useContext(LocaleCtx)
}

/** Pick the right string from a { ja, id, en } record. */
export function pick(rec: { ja: string; id: string; en: string }, locale: Locale) {
  return rec[locale] ?? rec.ja
}
