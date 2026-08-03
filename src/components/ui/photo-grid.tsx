'use client'

import { motion } from 'framer-motion'
import { Camera } from 'lucide-react'
import { cn } from '@/lib/utils'
import { PhotoCard } from '@/components/ui/photo-card'

/** Presentation-ready photo row — caption resolved at the feature layer. */
export type PhotoGridItem = {
  src: string
  caption: string
  /** Optional link target — PhotoCard becomes navigable. */
  href?: string
  /** Stable id used for selection state. Must be a mediaId() when selection is on. */
  selectableId?: string
}

type PhotoGridProps = {
  photos: PhotoGridItem[]
  isLoading?: boolean
  skeletonCount?: number
  className?: string
  /** Selection mode — when true each card uses toggle-on-click semantics. */
  selectable?: boolean
  /** Currently selected photo ids (stable media ids). */
  selectedIds?: ReadonlySet<string>
  /** Fires with the photo's stable media id when the card is toggled. */
  onToggleSelect?: (id: string) => void
}

export function PhotoGrid({
  photos,
  isLoading = false,
  skeletonCount = 8,
  className,
  selectable = false,
  selectedIds,
  onToggleSelect,
}: PhotoGridProps) {
  const gridClass = cn(
    'grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3 xl:grid-cols-4',
    className,
  )

  /* ── Loading ───────────────────────────────────────────────── */
  if (isLoading) {
    return (
      <div className={gridClass} aria-busy="true" aria-label="Memuat foto">
        {Array.from({ length: skeletonCount }, (_, i) => (
          <div key={i} className="shimmer aspect-square rounded-[1.35rem]" />
        ))}
      </div>
    )
  }

  /* ── Empty ─────────────────────────────────────────────────── */
  if (photos.length === 0) {
    return (
      <div
        className="flex flex-col items-center justify-center gap-3 py-16"
        role="status"
      >
        <Camera
          size={36}
          className="text-muted-foreground/50"
          aria-hidden="true"
          strokeWidth={1.5}
        />
        <p className="text-[12.5px] text-muted-foreground">
          Tidak ada foto untuk tag ini.
        </p>
      </div>
    )
  }

  /* ── Grid ──────────────────────────────────────────────────── */
  return (
    <div
      className={gridClass}
      role={selectable ? 'listbox' : undefined}
      aria-multiselectable={selectable ? 'true' : undefined}
      aria-label={selectable ? 'Pemilihan foto' : undefined}
    >
      {photos.map((photo, i) => {
        const stableId = photo.selectableId ?? photo.href ?? photo.src
        const isSelected = selectable && selectedIds ? selectedIds.has(stableId) : false
        return (
          <motion.div
            key={stableId}
            role={selectable ? 'option' : undefined}
            aria-selected={selectable ? isSelected : undefined}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, scale: isSelected ? 0.98 : 1 }}
            transition={{
              duration: 0.4,
              delay: Math.min(i * 0.03, 0.2),
              ease: [0.22, 1, 0.36, 1],
            }}
          >
            <PhotoCard
              src={photo.src}
              caption={photo.caption}
              href={selectable ? undefined : photo.href}
              selectable={selectable}
              selected={isSelected}
              onToggleSelect={onToggleSelect ? () => onToggleSelect(stableId) : undefined}
            />
          </motion.div>
        )
      })}
    </div>
  )
}
