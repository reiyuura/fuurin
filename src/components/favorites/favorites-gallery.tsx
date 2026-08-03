'use client'

/**
 * FavoritesGallery — client view of the user's favorited photos.
 *
 * Reads the favorites set from the existing `useFavorites` hook
 * (localStorage-backed) and filters the server-provided media list.
 */

import { useMemo } from 'react'
import { pick } from '@/lib/data'
import { useFavorites } from '@/lib/favorites'
import { useLocale } from '@/lib/i18n'
import { PhotoGrid, type PhotoGridItem } from '@/components/ui/photo-grid'
import { AlbumEmptyState } from '@/components/ui/album-empty-state'
import type { MediaItem } from '@/types/media'

type FavoritesGalleryProps = {
  items: MediaItem[]
}

export function FavoritesGallery({ items }: FavoritesGalleryProps) {
  const { isFavorite, ready } = useFavorites()
  const { locale } = useLocale()

  const photos = useMemo(() => {
    if (!ready) return []
    return items.filter((m) => isFavorite(m.src))
  }, [items, isFavorite, ready])

  const gridItems: PhotoGridItem[] = useMemo(
    () =>
      photos.map((m) => ({
        src: m.src,
        caption: pick(m.caption, locale),
        href: `/albums/${m.albumSlug}/photos/${m.idx}`,
      })),
    [photos, locale],
  )

  if (!ready) {
    return (
      <div className="shimmer h-64 w-full rounded-[1.5rem]" aria-busy="true" aria-label="Memuat favorit" />
    )
  }

  if (gridItems.length === 0) {
    return (
      <AlbumEmptyState
        title="Belum ada favorit"
        description="Tambahkan foto ke favorit dengan klik ikon hati di Media Library."
      />
    )
  }

  return <PhotoGrid photos={gridItems} />
}
