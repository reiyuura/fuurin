'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { FolderOpen, Search } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Blossom, Petal } from '@/components/ui/decor'

/* ── Types ──────────────────────────────────────────────────── */

type ButtonVariant = 'primary' | 'secondary'
type IllustrationVariant = 'sakura' | 'search' | 'folder'

type Action = {
  label: string
  href?: string
  onClick?: () => void
  variant?: ButtonVariant
}

type AlbumEmptyStateProps = {
  title: string
  description: string
  illustration?: IllustrationVariant
  action?: Action
  className?: string
}

/* ── Illustration clusters ──────────────────────────────────── */

function SakuraCluster() {
  return (
    <div className="relative mx-auto size-32" aria-hidden="true">
      {/* Center blossom */}
      <Blossom
        size={48}
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-primary/[.22]"
      />
      {/* Small floating petals */}
      <Petal size={12} className="absolute left-2 top-3 text-primary/[.18] -rotate-12" />
      <Petal size={10} className="absolute right-3 top-5 text-primary/[.24] rotate-[25deg]" />
      <Petal size={9} className="absolute bottom-4 left-6 text-primary/[.15] rotate-[60deg]" />
      <Petal size={11} className="absolute bottom-6 right-4 text-primary/[.20] -rotate-[40deg]" />
      {/* Offset small blossom */}
      <Blossom size={20} className="absolute right-1 top-9 text-primary/[.14]" />
    </div>
  )
}

function SearchIconCluster() {
  return (
    <div className="relative mx-auto size-32" aria-hidden="true">
      <Search
        size={52}
        strokeWidth={1.2}
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-muted-foreground/40"
      />
      <Petal size={10} className="absolute left-3 top-4 text-primary/[.20] -rotate-10" />
      <Petal size={8} className="absolute right-4 bottom-5 text-primary/[.16] rotate-[30deg]" />
    </div>
  )
}

function FolderCluster() {
  return (
    <div className="relative mx-auto size-32" aria-hidden="true">
      <FolderOpen
        size={52}
        strokeWidth={1.2}
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-muted-foreground/40"
      />
      <Petal size={9} className="absolute right-3 top-6 text-primary/[.18] rotate-[15deg]" />
      <Petal size={11} className="absolute bottom-6 left-5 text-primary/[.14] -rotate-[25deg]" />
    </div>
  )
}

const illustrationMap: Record<IllustrationVariant, React.FC> = {
  sakura: SakuraCluster,
  search: SearchIconCluster,
  folder: FolderCluster,
}

/* ── Button style map ───────────────────────────────────────── */

const buttonBase =
  'inline-flex items-center gap-2 rounded-full px-6 py-3 text-[13px] font-semibold tracking-wide transition-all duration-300 focus-visible:outline-none'

const buttonVariants: Record<ButtonVariant, string> = {
  primary: cn(buttonBase, 'bg-primary text-primary-foreground shadow-sakura hover:-translate-y-0.5'),
  secondary: cn(
    buttonBase,
    'border border-border bg-card text-foreground-strong shadow-paper hover:border-primary/30 hover:bg-hover hover:text-primary',
  ),
}

/* ── Component ──────────────────────────────────────────────── */

export function AlbumEmptyState({
  title,
  description,
  illustration = 'sakura',
  action,
  className,
}: AlbumEmptyStateProps) {
  const Illustration = illustrationMap[illustration]

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className={cn(
        'flex flex-col items-center gap-5 text-center',
        className,
      )}
    >
      {/* Illustration */}
      <Illustration />

      {/* Copy */}
      <div className="max-w-[42ch] space-y-2">
        <h3 className="font-jp text-[15px] font-semibold text-foreground-strong">
          {title}
        </h3>
        <p className="text-[12px] leading-relaxed text-muted-foreground">
          {description}
        </p>
      </div>

      {/* Optional action */}
      {action && (
        <div className="pt-2">
          {action.href ? (
            <Link
              href={action.href}
              className={buttonVariants[action.variant ?? 'primary']}
            >
              {action.label}
            </Link>
          ) : (
            <button
              type="button"
              onClick={action.onClick}
              className={buttonVariants[action.variant ?? 'primary']}
            >
              {action.label}
            </button>
          )}
        </div>
      )}
    </motion.div>
  )
}
