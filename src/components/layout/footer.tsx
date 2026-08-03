'use client'

import { useLocale, type DictKey } from '@/lib/i18n'
import { Fuurin, FujiScene } from '@/components/ui/decor'

const COLUMNS: { heading: DictKey; links: { key: DictKey; href: string }[] }[] = [
  {
    heading: 'footer.nav',
    links: [
      { key: 'nav.home', href: '/' },
      { key: 'nav.albums', href: '/albums' },
      { key: 'nav.timeline', href: '/timeline' },
      { key: 'nav.about', href: '/about' },
    ],
  },
  {
    heading: 'footer.help',
    links: [
      { key: 'footer.helpHow', href: '/about' },
      { key: 'footer.helpPrivacy', href: '/about' },
      { key: 'footer.helpContact', href: '/about' },
      { key: 'footer.helpFaq', href: '/about' },
    ],
  },
  {
    heading: 'footer.classTitle',
    links: [
      { key: 'footer.classTeacher', href: '/about' },
      { key: 'footer.classMembers', href: '/about' },
      { key: 'footer.classRules', href: '/about' },
      { key: 'footer.classGallery', href: '/albums' },
    ],
  },
]

// lucide-react dropped brand glyphs, so the social marks are inlined here.
const SOCIALS = [
  {
    label: 'Instagram',
    path: 'M12 2.2c3.2 0 3.6 0 4.9.07 1.2.05 1.8.25 2.2.42.6.23 1 .5 1.4.94.44.44.71.84.94 1.4.17.44.37 1 .42 2.2.07 1.3.07 1.7.07 4.9s0 3.6-.07 4.9c-.05 1.2-.25 1.8-.42 2.2-.23.6-.5 1-.94 1.4-.44.44-.84.71-1.4.94-.44.17-1 .37-2.2.42-1.3.07-1.7.07-4.9.07s-3.6 0-4.9-.07c-1.2-.05-1.8-.25-2.2-.42-.6-.23-1-.5-1.4-.94-.44-.44-.71-.84-.94-1.4-.17-.44-.37-1-.42-2.2C2.2 15.6 2.2 15.2 2.2 12s0-3.6.07-4.9c.05-1.2.25-1.8.42-2.2.23-.6.5-1 .94-1.4.44-.44.84-.71 1.4-.94.44-.17 1-.37 2.2-.42C8.4 2.2 8.8 2.2 12 2.2Zm0 5.3a4.5 4.5 0 1 0 0 9 4.5 4.5 0 0 0 0-9Zm0 1.8a2.7 2.7 0 1 1 0 5.4 2.7 2.7 0 0 1 0-5.4Zm4.8-2.9a1.05 1.05 0 1 0 0 2.1 1.05 1.05 0 0 0 0-2.1Z',
  },
  {
    label: 'X',
    path: 'M18.9 2H22l-6.8 7.8L23 22h-6.6l-5.2-6.8L5.2 22H2l7.3-8.3L1.5 2h6.7l4.8 6.4L18.9 2Zm-1.2 18h1.8L7.4 3.8H5.5L17.7 20Z',
  },
  {
    label: 'YouTube',
    path: 'M21.6 7.2a2.5 2.5 0 0 0-1.8-1.8C18.2 5 12 5 12 5s-6.2 0-7.8.4A2.5 2.5 0 0 0 2.4 7.2C2 8.8 2 12 2 12s0 3.2.4 4.8a2.5 2.5 0 0 0 1.8 1.8C5.8 19 12 19 12 19s6.2 0 7.8-.4a2.5 2.5 0 0 0 1.8-1.8C22 15.2 22 12 22 12s0-3.2-.4-4.8ZM10 15.2V8.8L15.5 12 10 15.2Z',
  },
  {
    label: 'LINE',
    path: 'M12 2C6.5 2 2 5.7 2 10.2c0 4 3.5 7.4 8.3 8.1.3.1.8.2.9.5.1.3.1.7 0 1l-.2 1c-.1.3-.2 1 .9.6 1-.5 5.6-3.3 7.6-5.6 1.4-1.5 2.5-3.2 2.5-5.6C22 5.7 17.5 2 12 2Z',
  },
]

export function Footer() {
  const { t } = useLocale()

  return (
    <footer className="footer-surface relative mt-20 overflow-hidden border-t border-border">
      {/* Lifted off the very bottom so the Fuji base and torii legs close instead of
          running off the page edge; slightly stronger tint to read as a silhouette. */}
      <FujiScene className="pointer-events-none absolute inset-x-0 bottom-6 h-36 w-full text-primary/[.09] dark:text-primary/[.06]" />

      <div className="relative mx-auto max-w-[1400px] px-4 pb-8 pt-10 sm:px-6 lg:px-8">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div>
            <div className="flex items-center gap-2">
              <Fuurin className="-my-3 w-6 scale-[.42]" />
              <span className="font-jp text-[13px] font-semibold text-foreground-strong">風鈴のクラス</span>
            </div>
            <p className="mt-2.5 max-w-[34ch] text-[11px] leading-relaxed text-muted-foreground">
              {t('footer.tagline')}
            </p>
            <ul className="mt-3.5 flex gap-1.5">
              {SOCIALS.map(({ label, path }) => (
                <li key={label}>
                  <a
                    href="#"
                    aria-label={label}
                    className="grid size-9 place-items-center rounded-full border border-border bg-card text-muted-foreground transition duration-300 hover:-translate-y-0.5 hover:border-primary hover:bg-hover hover:text-primary hover:shadow-[0_4px_12px_rgba(200,124,141,0.18)]"
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                      <path d={path} />
                    </svg>
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {COLUMNS.map((col) => (
            <div key={col.heading}>
              <h2 className="font-jp text-[11.5px] font-bold text-foreground-strong">{t(col.heading)}</h2>
              <ul className="mt-2.5 space-y-1.5">
                {col.links.map((l) => (
                  <li key={l.key}>
                    <a
                      href={l.href}
                      className="text-[11px] text-muted-foreground transition hover:text-primary"
                    >
                      {t(l.key)}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <p className="mt-9 border-t border-border pt-5 text-center font-jp text-[10.5px] text-muted-foreground">
          © 2026 風鈴のクラス • {t('footer.madeWith')}
        </p>
      </div>
    </footer>
  )
}
