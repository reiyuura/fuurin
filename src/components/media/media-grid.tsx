'use client'

import { useLocale } from '@/lib/i18n'
import { pick } from '@/lib/data'
import { PhotoGrid, type PhotoGridItem } from '@/components/ui/photo-grid'
import type { MediaItem } from '@/types/media'

type MediaGridProps = {
  items: MediaItem[]
  selectable?: boolean
  selectedIds?: ReadonlySet<string>
  onToggleSelect?: (id: string) => void
  className?: string
}

/**
 * Thin wrapper over PhotoGrid. Maps MediaItem → PhotoGridItem:
 *  - caption resolved via current locale
 *  - href points to the Photo Viewer route (unless selectable)
 *  - selectableId is the stable mediaId()
 *
 * Per the layering rule, this file does not duplicate render logic
 * — all rendering stays inside PhotoGrid → PhotoCard.
 */
export function MediaGrid({
  items,
  selectable,
  selectedIds,
  onToggleSelect,
  className,
}: MediaGridProps) {
  const { locale } = useLocale()

  const photos: PhotoGridItem[] = items.map((item) => ({
    src: item.src,
    caption: pick(item.caption, locale),
    href: `/albums/${item.albumSlug}/photos/${item.idx}`,
    selectableId: item.id,
  }))

  return (
    <PhotoGrid
      photos={photos}
      selectable={selectable}
      selectedIds={selectedIds}
      onToggleSelect={onToggleSelect}
      className={className}
    />
  )
}
