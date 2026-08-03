'use client'

import { motion } from 'framer-motion'
import { Clock, FolderOpen, Search, Sparkles } from 'lucide-react'
import { useLocale, type DictKey } from '@/lib/i18n'
import { useSearch } from '@/lib/search'

const ACTIONS: {
  icon: typeof Clock
  title: DictKey
  sub: DictKey
  href?: string
  action?: 'search'
}[] = [
  { icon: FolderOpen, title: 'quick.latest', sub: 'quick.latestSub', href: '/albums' },
  { icon: Sparkles, title: 'quick.today', sub: 'quick.todaySub', href: '#today' },
  { icon: Clock, title: 'quick.timeline', sub: 'quick.timelineSub', href: '/timeline' },
  { icon: Search, title: 'quick.search', sub: 'quick.searchSub', action: 'search' },
]

export function QuickActions() {
  const { t } = useLocale()
  const { setOpen } = useSearch()

  return (
    <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {ACTIONS.map(({ icon: Icon, title, sub, href, action }) => {
        const inner = (
          <>
            <span className="grid size-12 shrink-0 place-items-center rounded-[1.2rem] bg-gradient-to-br from-primary-subtle to-primary-subtle-strong text-primary-ink shadow-inner transition-all duration-300 group-hover:scale-105 group-hover:from-[#c87c8d] group-hover:to-[#a85567] group-hover:text-primary-foreground dark:from-primary/15 dark:to-primary/10 dark:text-primary-ink">
              <Icon size={17} aria-hidden="true" strokeWidth={2.1} />
            </span>
            <span className="min-w-0">
              <span className="block truncate font-jp text-[13.5px] font-semibold leading-snug tracking-tight text-foreground-strong transition-colors duration-300 group-hover:text-primary-ink dark:group-hover:text-primary-ink">
                {t(title)}
              </span>
              <span className="mt-1 block truncate text-[10.5px] leading-relaxed text-muted-foreground">{t(sub)}</span>
            </span>
          </>
        )

        const cls =
          'card-paper shadow-paper group flex w-full items-center gap-4 rounded-[1.5rem] border border-border/50 px-5 py-4 text-left transition duration-300 hover:-translate-y-1.5 hover:border-primary/25 hover:shadow-[0_16px_36px_rgba(200,124,141,0.16)]'

        return (
          <motion.div key={title}>
            {action === 'search' ? (
              <button onClick={() => setOpen(true)} className={cls}>
                {inner}
              </button>
            ) : (
              <a href={href} className={cls}>
                {inner}
              </a>
            )}
          </motion.div>
        )
      })}
    </section>
  )
}
