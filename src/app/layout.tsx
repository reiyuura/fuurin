import type { Metadata } from 'next'
import { Geist, Geist_Mono, Noto_Sans_JP, Noto_Serif_JP } from 'next/font/google'
import { ThemeProvider } from '@/lib/theme'
import { themeScript } from '@/lib/theme-script'
import { LocaleProvider } from '@/lib/i18n'
import { FavoritesProvider } from '@/lib/favorites'
import { SearchProvider } from '@/lib/search'
import { SessionProvider } from '@/components/auth/session-provider'
import { ToastProvider } from '@/components/ui/toast'
import { SearchPalette } from '@/components/ui/search-palette'
import './globals.css'

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

// CJK fonts: no `subsets` so Google serves the full Japanese unicode-range.
// `preload: false` avoids preloading megabytes of glyphs on first paint.
const notoSerifJP = Noto_Serif_JP({
  weight: ['400', '600', '700'],
  variable: '--font-noto-serif-jp',
  display: 'swap',
  preload: false,
})

const notoSansJP = Noto_Sans_JP({
  weight: ['400', '500', '600'],
  variable: '--font-noto-sans-jp',
  display: 'swap',
  preload: false,
})

const siteUrl = process.env.SITE_URL ?? process.env.NEXT_PUBLIC_SITE_URL ?? 'https://fuurin.reiyuura.pw'

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: '風鈴のクラス | Fuurin no Class',
    template: '%s | 風鈴のクラス',
  },
  description:
    'Kenangan hari-hari kita belajar, berteman, dan tumbuh bersama. — 一緒に学び、笑い、成長した日々の記憶。',
  applicationName: 'Fuurin no Class',
  alternates: { canonical: '/' },
  openGraph: {
    type: 'website',
    siteName: '風鈴のクラス',
    title: '風鈴のクラス | Fuurin no Class',
    description: 'Album kenangan kelas yang hangat, tenang, dan mudah dijelajahi.',
    url: '/',
    images: [
      {
        url: 'https://images.unsplash.com/photo-1522383225653-ed111181a951?auto=format&fit=crop&w=1200&q=85',
        width: 1200,
        height: 630,
        alt: 'Bunga sakura untuk Fuurin no Class',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: '風鈴のクラス | Fuurin no Class',
    description: 'Album kenangan kelas yang hangat, tenang, dan mudah dijelajahi.',
    images: ['https://images.unsplash.com/photo-1522383225653-ed111181a951?auto=format&fit=crop&w=1200&q=85'],
  },
  robots: { index: true, follow: true },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="ja" className={`${geistSans.variable} ${geistMono.variable} ${notoSerifJP.variable} ${notoSansJP.variable} h-full antialiased`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="flex min-h-full flex-col">
        <ThemeProvider>
          <LocaleProvider>
            <FavoritesProvider>
              <SearchProvider>
                <SessionProvider>
                  <ToastProvider>
                    {children}
                    <SearchPalette />
                  </ToastProvider>
                </SessionProvider>
              </SearchProvider>
            </FavoritesProvider>
          </LocaleProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
