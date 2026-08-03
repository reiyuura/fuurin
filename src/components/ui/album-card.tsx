'use client'

import Link from 'next/link'
import Image from 'next/image'
import { motion } from 'framer-motion'
import { Images, Users } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Card } from '@/components/ui/card'
import { StatBadge } from '@/components/ui/stat-badge'

type AlbumCardProps = {
  /** URL-safe identifier, used to build the detail link `/albums/:slug`. */
  slug: string
  /** Cover image URL. */
  cover: string
  /** Album title (any locale). */
  title: string
  /** Display date, e.g. "April 2026". */
  date: string
  /** Photo count shown in the overlay badge. */
  photoCount: number
  /** Optional member count — badge hidden when omitted. */
  memberCount?: number
  /** Optional base‑64 blur placeholder for next/image. */
  blurDataURL?: string
  /** Optional tag list (not rendered; reserved for future use). */
  tags?: string[]
  /** Extra classes appended to the motion wrapper. */
  className?: string
}

export function AlbumCard({
  slug,
  cover,
  title,
  date,
  photoCount,
  memberCount,
  blurDataURL,
  className,
}: AlbumCardProps) {
  return (
    <motion.div
      whileHover={{ y: -6, scale: 1.015 }}
      transition={{ type: 'spring', stiffness: 240, damping: 20 }}
      className={cn('shrink-0', className)}
    >
      <Link
        href={`/albums/${slug}`}
        className="group block focus-visible:outline-none"
      >
        <Card className="p-1.5 pb-0 sm:p-2.5 sm:pb-0 transition-shadow duration-300 group-hover:border-primary/25 group-hover:shadow-[0_18px_42px_rgba(200,124,141,0.18)]">
          {/* ── Cover image 4:3 ─────────────────────────────────── */}
          <div className="relative aspect-[4/3] overflow-hidden rounded-[0.8rem] bg-muted sm:rounded-[1rem]">
            <Image
              src={cover}
              alt={title}
              fill
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 50vw, 224px"
              placeholder={blurDataURL ? 'blur' : undefined}
              blurDataURL={blurDataURL}
              className="object-cover transition duration-[900ms] ease-out group-hover:scale-[1.08]"
            />

            {/* Scrim — opacity‑based black, always dark regardless of theme */}
            <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/78 via-black/30 to-transparent px-2 pb-2 pt-9 sm:px-3 sm:pb-2.5">
              <div className="flex items-center gap-1.5">
                <StatBadge icon={Images} value={photoCount} />
                {memberCount !== undefined && memberCount > 0 && (
                  <StatBadge icon={Users} value={memberCount as number} />
                )}
              </div>
            </div>
          </div>

          {/* ── Caption band ────────────────────────────────────── */}
          <div className="px-1 pb-3 pt-2.5 sm:px-1.5 sm:pb-4 sm:pt-3.5">
            <h3 className="truncate font-jp text-[12px] font-semibold leading-snug tracking-tight text-foreground-strong transition-colors duration-300 group-hover:text-primary-ink sm:text-[13.5px]">
              {title}
            </h3>
            <p className="mt-1 truncate text-[9.5px] font-medium tracking-[.04em] text-subtle-foreground sm:mt-1.5 sm:text-[10.5px]">
              {date}
            </p>
          </div>
        </Card>
      </Link>
    </motion.div>
  )
}
