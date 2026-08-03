'use client'

import { motion } from 'framer-motion'
import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

/* ── Category model ─────────────────────────────────────────── */

export type Category = {
  /** Unique identifier emitted via onChange. */
  value: string
  /** Display label. */
  label: string
  /** Optional leading icon. */
  icon?: LucideIcon
  /** Optional count badge. */
  count?: number
  /** When true the pill is inert (not clickable, no hover). */
  disabled?: boolean
}

/* ── Props ──────────────────────────────────────────────────── */

type AlbumFilterProps = {
  /** Category list — provided by the page layer. */
  categories: Category[]
  /** Currently active category value. */
  active: string
  /** Fires with the new category value on click. */
  onChange: (value: string) => void
  className?: string
}

/** Horizon of layout-animated chips for bylines with extra details, data, or views. */
export function AlbumFilter({
  categories,
  active,
  onChange,
  className,
}: AlbumFilterProps) {
  return (
    <div
      role="group"
      aria-label="Filter album"
      className={cn(
        'flex flex-wrap items-center gap-2 overflow-x-auto sm:flex-wrap sm:overflow-visible',
        '[scrollbar-width:none] [&::-webkit-scrollbar]:hidden',
        className,
      )}
    >
      {categories.map((cat) => {
        const isActive = cat.value === active

        return (
          <motion.button
            key={cat.value}
            type="button"
            onClick={() => onChange(cat.value)}
            disabled={cat.disabled}
            aria-pressed={isActive}
            whileTap={cat.disabled ? undefined : { scale: 0.95 }}
            className={cn(
              'relative isolate inline-flex items-center gap-1.5 rounded-full px-4 py-2.5 text-[12px] font-semibold tracking-wide whitespace-nowrap transition-colors',
              'min-h-10 select-none focus-visible:outline-none',
              cat.disabled && 'pointer-events-none opacity-40',
              isActive
                ? 'text-primary-foreground'
                : 'text-subtle-foreground hover:bg-hover hover:text-foreground-strong',
            )}
          >
            {/* Shared animated background — slides between active pills */}
            {isActive && (
              <motion.div
                layoutId="album-filter-active"
                transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                className="absolute inset-0 rounded-full bg-primary shadow-sakura"
              />
            )}

            {/* Content — stacked above the background via z-10 */}
            <span className="relative z-10 flex items-center gap-1.5">
              {cat.icon && <cat.icon size={13} aria-hidden="true" />}
              {cat.label}
              {cat.count !== undefined && (
                <span
                  className={cn(
                    'ml-0.5 grid min-w-[18px] place-items-center rounded-full px-1 py-px text-[9.5px] font-bold leading-tight',
                    isActive
                      ? 'bg-white/20 text-primary-foreground'
                      : 'bg-muted text-muted-foreground',
                  )}
                >
                  {cat.count}
                </span>
              )}
            </span>
          </motion.button>
        )
      })}
    </div>
  )
}
