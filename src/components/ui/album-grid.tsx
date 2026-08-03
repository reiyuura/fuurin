'use client'

import { motion } from 'framer-motion'
import { Images } from 'lucide-react'
import { cn } from '@/lib/utils'
import { AlbumCard } from '@/components/ui/album-card'
import { AlbumCardSkeleton } from '@/components/ui/album-card-skeleton'

/** Presentation-ready album row — locale resolution done at the page layer. */
type AlbumGridItem = {
  slug: string
  cover: string
  title: string
  date: string
  photoCount: number
  memberCount?: number
  blurDataURL?: string
}

type AlbumGridProps = {
  albums: AlbumGridItem[]
  isLoading?: boolean
  skeletonCount?: number
  emptyMessage?: string
  className?: string
}

export function AlbumGrid({
  albums,
  isLoading = false,
  skeletonCount = 8,
  emptyMessage = 'Belum ada album.',
  className,
}: AlbumGridProps) {
  /* ── Loading ───────────────────────────────────────────────── */
  if (isLoading) {
    return (
      <div
        className={cn(
          'grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4',
          className,
        )}
        aria-busy="true"
        aria-label="Memuat album"
      >
        {Array.from({ length: skeletonCount }, (_, i) => (
          <AlbumCardSkeleton key={i} />
        ))}
      </div>
    )
  }

  /* ── Empty ─────────────────────────────────────────────────── */
  if (albums.length === 0) {
    return (
      <div
        className={cn(
          'flex flex-col items-center justify-center gap-3 py-20',
          className,
        )}
        role="status"
      >
        <Images
          size={40}
          className="text-muted-foreground/50"
          aria-hidden="true"
          strokeWidth={1.5}
        />
        <p className="font-jp text-[13px] text-muted-foreground">
          {emptyMessage}
        </p>
        <p className="text-[11px] text-subtle-foreground">
          Album pertama akan muncul di sini.
        </p>
      </div>
    )
  }

  /* ── Grid ──────────────────────────────────────────────────── */
  return (
    <div
      className={cn(
        'grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4',
        className,
      )}
    >
      {albums.map((album, i) => (
        <motion.div
          key={album.slug}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            duration: 0.45,
            delay: Math.min(i * 0.04, 0.25),
            ease: [0.22, 1, 0.36, 1],
          }}
        >
          <AlbumCard
            slug={album.slug}
            cover={album.cover}
            title={album.title}
            date={album.date}
            photoCount={album.photoCount}
            memberCount={album.memberCount}
            blurDataURL={album.blurDataURL}
          />
        </motion.div>
      ))}
    </div>
  )
}
