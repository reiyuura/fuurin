'use client'

import Link from 'next/link'
import Image from 'next/image'
import { cn } from '@/lib/utils'

export type ThumbnailItem = {
  src: string
  alt: string
  href: string
  active?: boolean
}

type ThumbnailStripProps = {
  thumbnails: ThumbnailItem[]
  /** Accessible label for the nav landmark. */
  label: string
  className?: string
}

/**
 * Horizontal scroll strip of photo thumbnails — render-only.
 * The active thumbnail carries `aria-current` + a primary ring.
 */
export function ThumbnailStrip({ thumbnails, label, className }: ThumbnailStripProps) {
  return (
    <nav
      aria-label={label}
      className={cn(
        'flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden',
        className,
      )}
    >
      {thumbnails.map((thumb, i) => (
        <Link
          key={`${thumb.src}-${i}`}
          href={thumb.href}
          replace
          aria-current={thumb.active ? 'true' : undefined}
          aria-label={thumb.alt}
          className={cn(
            'relative size-14 shrink-0 overflow-hidden rounded-xl border-2 transition duration-300 focus-visible:outline-none sm:size-16 lg:size-[72px]',
            thumb.active
              ? 'border-primary shadow-sakura'
              : 'border-transparent opacity-70 hover:opacity-100 hover:border-border',
          )}
        >
          <Image
            src={thumb.src}
            alt=""
            fill
            sizes="72px"
            className="object-cover"
          />
        </Link>
      ))}
    </nav>
  )
}
