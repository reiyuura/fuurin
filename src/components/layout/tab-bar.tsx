'use client'

import { usePathname } from 'next/navigation'
import { Clock, Home, Images, Search, User, Users } from 'lucide-react'
import { useLocale, type DictKey } from '@/lib/i18n'
import { useSearch } from '@/lib/search'

const TABS: { key: DictKey; href?: string; icon: typeof Home; action?: 'search' }[] = [
  { key: 'tab.home', href: '/', icon: Home },
  { key: 'tab.albums', href: '/albums', icon: Images },
  { key: 'tab.timeline', href: '/timeline', icon: Clock },
  { key: 'tab.members', href: '/members', icon: Users },
  { key: 'tab.search', icon: Search, action: 'search' },
  { key: 'tab.profile', href: '/favorites', icon: User },
]

/** Bottom tab bar, mobile only. Mirrors the reference's 5-item nav. */
export function TabBar({ active = '/' }: { active?: string }) {
  const { t } = useLocale()
  const { setOpen } = useSearch()
  const pathname = usePathname()

  /* Hidden inside the Photo Viewer — the viewer owns its own chrome
     and the bottom bar would cover the caption/actions. */
  if (pathname.includes('/photos/')) return null

  return (
    <nav
      aria-label={t('menu.open')}
      className="glass-washi fixed inset-x-0 bottom-0 z-40 border-t border-border shadow-[0_-4px_20px_rgba(160,104,96,0.07)] md:hidden"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <ul className="mx-auto flex max-w-md">
        {TABS.map(({ key, href, icon: Icon, action }) => {
          const on = href === active
          const cls = `flex w-full flex-col items-center gap-0.5 border-t-2 px-1 pb-1.5 pt-2 text-[9.5px] font-medium transition ${
            on
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground'
          }`

          return (
            <li key={key} className="flex-1">
              {action === 'search' ? (
                <button onClick={() => setOpen(true)} className={cls} aria-label={t('search.open')}>
                  <Icon size={17} aria-hidden="true" />
                  {t(key)}
                </button>
              ) : (
                <a href={href} aria-current={on ? 'page' : undefined} className={cls}>
                  <Icon size={17} aria-hidden="true" />
                  {t(key)}
                </a>
              )}
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
