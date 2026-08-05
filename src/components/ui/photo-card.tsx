'use client'

import Link from 'next/link'
import Image from 'next/image'
import { motion } from 'framer-motion'
import { Check, Heart } from 'lucide-react'
import { useFavorites } from '@/lib/favorites'
import { useLocale } from '@/lib/i18n'
import { cn } from '@/lib/utils'

export function PhotoCard({
  src,
  caption,
  aspect = 'square',
  href,
  className,
  selectable = false,
  selected = false,
  onToggleSelect,
}: {
  src: string
  caption: string
  aspect?: 'square' | 'portrait'
  /** Optional link target — wraps image + caption, not the favorite button. */
  href?: string
  className?: string
  /** Selection mode — when true the click area toggles selection. */
  selectable?: boolean
  /** Currently selected (visual ring + checkbox). */
  selected?: boolean
  /** Called when the user taps/clicks in selection mode. */
  onToggleSelect?: () => void
}) {
  const { isFavorite, toggle, ready } = useFavorites()
  const { t } = useLocale()
  const fav = ready && isFavorite(src)

  /* ── Click handler ──────────────────────────────────────────
     - selectable mode → toggle selection (no navigation).
     - normal mode → Link wrapping the image handles navigation.
  */
  const onCardClick = selectable
    ? (e: React.MouseEvent) => {
        // Don't toggle when the favorite button itself is the target.
        const target = e.target as HTMLElement
        if (target.closest('[data-photocard-action]')) return
        e.preventDefault()
        onToggleSelect?.()
      }
    : undefined

  return (
    <motion.figure
      whileHover={selectable ? undefined : { y: -6 }}
      transition={{ type: 'spring', stiffness: 240, damping: 20 }}
      onClick={onCardClick}
      aria-selected={selectable ? selected : undefined}
      data-photocardselectable={selectable || undefined}
      className={cn(
        'photo-print group relative overflow-hidden rounded-[1.35rem] bg-muted transition-shadow duration-300',
        !selectable && 'hover:shadow-[0_18px_40px_rgba(200,124,141,0.20)]',
        selectable && 'cursor-pointer focus-visible:outline-none',
        selected && 'ring-2 ring-primary ring-offset-2 ring-offset-background',
        aspect === 'square' ? 'aspect-square' : 'aspect-[4/5]',
        className,
      )}
    >
      {/* Image + caption — link target when href is provided and NOT in selection mode */}
      {href && !selectable ? (
        <Link
          href={href}
          className="absolute inset-0 block"
          aria-label={caption}
        >
          <CardBody src={src} caption={caption} />
        </Link>
      ) : (
        <CardBody src={src} caption={caption} />
      )}

      {/* Favorite — sibling of the link so clicks never navigate.
          Visual 36px; hit area expanded to 44px via an inset pseudo-layer. */}
      <button
        data-photocard-action="favorite"
        onClick={(e) => {
          e.stopPropagation()
          toggle(src)
        }}
        aria-label={fav ? t('favorites.remove') : t('favorites.add')}
        aria-pressed={fav}
        className={`group/fav absolute right-3 top-3 z-10 grid size-9 place-items-center rounded-full backdrop-blur-md transition duration-300 hover:scale-110 focus-visible:outline-none after:absolute after:-inset-1.5 after:rounded-full after:content-[''] ${ fav ? 'bg-card/92 text-primary shadow-[0_3px_12px_rgba(200,124,141,0.32)] dark:bg-[#2a2624]/88 dark:text-primary-ink' : 'bg-card/65 text-muted-foreground opacity-0 group-hover:opacity-100 focus-visible:opacity-100 dark:bg-[#2a2624]/60 '}`}
        >
        <Heart size={15} fill={fav ? 'currentColor' : 'none'} aria-hidden="true" className={`transition-transform duration-300 ${fav ? 'scale-110' : 'scale-100'}`} />
      </button>

      {/* Selection checkbox — only visible in selection mode */}
      {selectable && (
        <div
          data-photocard-action="checkbox"
          className={cn(
            'absolute left-3 top-3 z-10 grid size-7 place-items-center rounded-full border-2 backdrop-blur-md transition',
            selected
              ? 'border-primary bg-primary text-primary-foreground shadow-sakura'
              : 'border-white/70 bg-card/40 text-transparent opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100',
          )}
          aria-hidden="true"
        >
          <Check size={14} strokeWidth={3} />
        </div>
      )}
    </motion.figure>
  )
}

function CardBody({ src, caption }: { src: string; caption: string }) {
  return (
    <>
      <Image
        src={src}
        alt={caption}
        fill
        sizes="(max-width: 640px) 50vw, (max-width: 1280px) 33vw, 320px"
        className="object-cover transition duration-[900ms] ease-out group-hover:scale-[1.08]"
      />
      {/* Warm sepia scrim — deeper for better caption legibility. */}
      <figcaption className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#2b211f]/92 via-[#2b211f]/28 to-transparent px-4 pb-3.5 pt-12 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
        <span className="block truncate font-jp text-[12px] font-medium leading-normal text-on-media drop-shadow-[0_1px_4px_rgba(43,33,31,0.9)]">
          {caption}
        </span>
      </figcaption>
    </>
  )
}
