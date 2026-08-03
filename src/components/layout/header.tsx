'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import {
  Bell,
  ChevronDown,
  Clock,
  Globe2,
  Heart,
  Home,
  Images,
  Info,
  Menu,
  Moon,
  Search,

  Sun,

  X,
} from 'lucide-react'
import { CURRENT_USER } from '@/lib/data'
import { LOCALES, useLocale, type DictKey } from '@/lib/i18n'
import { useSearch } from '@/lib/search'
import { useTheme } from '@/lib/theme'
import { Fuurin } from '@/components/ui/decor'
import { Dropdown } from '@/components/ui/dropdown'
import { UserMenu } from '@/components/auth/user-menu'

const NAV: { key: DictKey; href: string; icon: typeof Home }[] = [
  { key: 'nav.home', href: '/', icon: Home },
  { key: 'nav.albums', href: '/albums', icon: Images },
  { key: 'nav.timeline', href: '/timeline', icon: Clock },
  { key: 'nav.about', href: '/about', icon: Info },
  { key: 'nav.favorites', href: '/favorites', icon: Heart },
]

const NOTIFS: DictKey[] = ['notif.n1', 'notif.n2', 'notif.n3']

export function Header({ active = '/' }: { active?: string }) {
  const { locale, setLocale, t } = useLocale()
  const { theme, toggle } = useTheme()
  const { setOpen: setSearchOpen } = useSearch()
  const [open, setOpen] = useState<'lang' | 'bell' | 'user' | null>(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const [isMac, setIsMac] = useState(true)

  useEffect(() => {
    setIsMac(/Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent))
  }, [])

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    if (!open) return
    const close = () => setOpen(null)
    window.addEventListener('click', close)
    return () => window.removeEventListener('click', close)
  }, [open])

  const current = LOCALES.find((l) => l.code === locale)!
  const stop = (e: React.MouseEvent) => e.stopPropagation()

  return (
    <header
      className="fixed top-0 z-50 w-full"
      style={{ paddingTop: 'env(safe-area-inset-top)' }}
    >
      <div
        className={`glass-washi border-b transition-shadow ${ scrolled ? 'border-border shadow-[0_4px_22px_rgba(160,104,96,0.09)]' : 'border-transparent' }`}
      >
        <div className="mx-auto flex h-12 max-w-[1400px] items-center gap-2 px-3 sm:h-14 sm:gap-3 sm:px-6 lg:px-8">
          <a href="/" className="flex shrink-0 items-center gap-1.5 sm:gap-2">
            <Fuurin className="-my-3 w-6 scale-[.42]" />
            <span className="leading-none">
              <span className="block font-jp text-[12px] font-semibold text-foreground-strong sm:text-[13px]">風鈴のクラス</span>
              <span className="hidden text-[9px] tracking-[.13em] text-subtle-foreground sm:block">
                Fuurin no Class
              </span>
            </span>
          </a>

          <nav className="hidden items-center xl:flex">
            <ul className="flex">
            {NAV.map(({ key, href, icon: Icon }) => (
              <li key={href}>
              <a
                key={href}
                href={href}
                aria-current={active === href ? 'page' : undefined}
                className={`flex items-center gap-1.5 border-b-2 px-3 py-[17px] text-xs font-medium transition-colors ${ active === href ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-primary' }`}
              >
                <Icon size={13} aria-hidden="true" />
                {t(key)}
              </a>
              </li>
            ))}
            </ul>
          </nav>

          <button
            onClick={() => setSearchOpen(true)}
            aria-label={t('search.open')}
            className="ml-auto hidden h-9 min-w-0 max-w-xs flex-1 items-center gap-2 rounded-full border border-border/70 bg-card px-3.5 text-left transition duration-300 hover:border-primary/35 hover:bg-hover md:flex"
          >
            <Search size={13} className="shrink-0 text-subtle-foreground" aria-hidden="true" />
            <span className="min-w-0 flex-1 truncate font-jp text-[11px] text-subtle-foreground">
              {t('search.placeholder')}
            </span>
            <kbd className="shrink-0 rounded-md border border-border/70 bg-card px-1.5 py-0.5 font-mono text-[9px] font-semibold text-muted-foreground">
              {isMac ? '⌘K' : 'Ctrl K'}
            </kbd>
          </button>

          <div className="ml-auto flex items-center gap-0.5 md:ml-0">
            <button
              onClick={() => setSearchOpen(true)}
              aria-label={t('search.open')}
              className="grid size-8 place-items-center rounded-full text-muted-foreground transition hover:bg-hover hover:text-primary md:hidden"
            >
              <Search size={15} aria-hidden="true" />
            </button>

            <div className="relative">
              <button
                onClick={(e) => {
                  stop(e)
                  setOpen(open === 'lang' ? null : 'lang')
                }}
                aria-label={t('lang.switch')}
                aria-expanded={open === 'lang'}
                className="flex h-8 items-center gap-1 rounded-full px-2 text-[11px] text-muted-foreground transition hover:bg-hover hover:text-primary"
              >
                <Globe2 size={13} aria-hidden="true" />
                <span className="hidden sm:inline">{current.code.toUpperCase()}</span>
                <ChevronDown size={10} aria-hidden="true" className={open === 'lang' ? 'rotate-180' : ''} />
              </button>
              {open === 'lang' && (
                <Dropdown onClick={stop} className="w-36">
                  {LOCALES.map((l) => (
                    <button
                      key={l.code}
                      onClick={() => {
                        setLocale(l.code)
                        setOpen(null)
                      }}
                      className={`flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs transition ${ l.code === locale ? 'bg-primary-subtle text-primary dark:bg-primary/20 dark:text-primary-ink' : 'text-foreground-strong hover:bg-hover' }`}
                    >
                      <span aria-hidden="true">{l.flag}</span>
                      {l.label}
                    </button>
                  ))}
                </Dropdown>
              )}
            </div>

            <button
              onClick={toggle}
              aria-label={t('theme.toggle')}
              className="grid size-8 place-items-center rounded-full text-muted-foreground transition hover:bg-hover hover:text-primary"
            >
              {theme === 'dark' ? <Sun size={14} aria-hidden="true" /> : <Moon size={14} aria-hidden="true" />}
            </button>

            <div className="relative">
              <button
                onClick={(e) => {
                  stop(e)
                  setOpen(open === 'bell' ? null : 'bell')
                }}
                aria-label={t('notif.label')}
                aria-expanded={open === 'bell'}
                className="relative grid size-8 place-items-center rounded-full text-muted-foreground transition hover:bg-hover hover:text-primary"
              >
                <Bell size={14} aria-hidden="true" />
                {CURRENT_USER.notifications > 0 && (
                  <span className="absolute right-1 top-1 grid size-3.5 place-items-center rounded-full bg-primary-strong text-[8px] font-bold text-primary-foreground">
                    {CURRENT_USER.notifications}
                  </span>
                )}
              </button>
              {open === 'bell' && (
                <Dropdown onClick={stop} className="w-64">
                  <p className="px-3 pb-1 pt-1 text-[10px] font-bold uppercase tracking-[.14em] text-subtle-foreground">
                    {t('notif.title')}
                  </p>
                  {NOTIFS.map((key) => (
                    <p
                      key={key}
                      className="rounded-xl px-3 py-2 font-jp text-[11px] leading-snug text-foreground-strong transition hover:bg-hover"
                    >
                      {t(key)}
                    </p>
                  ))}
                </Dropdown>
              )}
            </div>

            <div className="relative">
              <UserMenu />
            </div>

            <button
              onClick={() => setMenuOpen((v) => !v)}
              aria-label={t('menu.open')}
              aria-expanded={menuOpen}
              className="grid size-8 place-items-center rounded-full text-muted-foreground hover:bg-hover xl:hidden"
            >
              {menuOpen ? <X size={16} aria-hidden="true" /> : <Menu size={16} aria-hidden="true" />}
            </button>
          </div>
        </div>
      </div>

      {menuOpen && (
        <motion.nav
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-washi border-b border-border/50 px-3 py-2 shadow-[0_8px_24px_rgba(160,104,96,0.08)] xl:hidden"
        >
          <ul>
          {NAV.map(({ key, href, icon: Icon }) => (
            <li key={href}>
            <a
              href={href}
              aria-current={active === href ? 'page' : undefined}
              className={`flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-xs font-medium ${ active === href ? 'bg-primary-subtle text-primary dark:bg-primary/20 dark:text-primary-ink' : 'text-foreground-strong hover:bg-hover' }`}
            >
              <Icon size={14} aria-hidden="true" />
              {t(key)}
            </a>
            </li>
          ))}
          </ul>
        </motion.nav>
      )}
    </header>
  )
}


