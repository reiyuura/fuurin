'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { motion } from 'framer-motion'
import { CalendarDays, Heart, Images as ImagesIcon, X } from 'lucide-react'
import { useFavorites } from '@/lib/favorites'
import { useLocale } from '@/lib/i18n'
import { pick } from '@/lib/data'
import { Tag } from '@/components/ui/tag'
import type { MediaItem } from '@/types/media'

type MediaDetailsProps = {
  /** Active media — `null` means the drawer is not rendered at all. */
  item: MediaItem | null
  onClose: () => void
}

/**
 * Read-only details drawer. Per refinement #4 — when no media is
 * active the component returns `null` rather than just hiding, so
 * no listeners, refs, or layout nodes exist.
 */
export function MediaDetails({ item, onClose }: MediaDetailsProps) {
  const { locale, t } = useLocale()
  const { isFavorite, toggle, ready } = useFavorites()
  const fav = ready && item ? isFavorite(item.src) : false

  // Lock body scroll while the drawer is open.
  useEffect(() => {
    if (!item) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [item])

  // Esc to close.
  useEffect(() => {
    if (!item) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [item, onClose])

  if (!item) return null

  const albumHref = `/albums/${item.albumSlug}`

  return (
    <div className="fixed inset-0 z-[90] flex justify-end" role="dialog" aria-modal="true" aria-label="Detail foto">
      <button
        onClick={onClose}
        aria-label="Tutup detail"
        className="absolute inset-0 cursor-default bg-scrim/45 backdrop-blur-sm"
      />
      <motion.aside
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
        className="card-paper relative flex h-full w-full max-w-md flex-col overflow-y-auto border-l border-border/60 shadow-[0_18px_60px_rgba(0,0,0,0.18)]"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          aria-label="Tutup detail"
          className="absolute right-3 top-3 z-10 grid size-9 place-items-center rounded-full bg-card/85 text-foreground-strong backdrop-blur-md transition hover:bg-card"
        >
          <X size={15} aria-hidden="true" />
        </button>

        {/* Preview */}
        <div className="relative aspect-[4/3] w-full overflow-hidden bg-[#17140f]">
          <Image
            src={item.src}
            alt={pick(item.caption, locale)}
            fill
            sizes="(max-width: 768px) 100vw, 28rem"
            className="object-cover"
          />
        </div>

        {/* Body */}
        <div className="space-y-5 p-5">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[.18em] text-subtle-foreground">
              {item.albumSlug.replace(/-/g, ' · ')}
            </p>
            <h2 className="font-jp mt-2 text-[17px] font-semibold leading-snug text-foreground-strong">
              {pick(item.caption, locale)}
            </h2>
          </div>

          <div className="space-y-2 rounded-2xl border border-border/60 bg-card/40 p-3 text-[12px]">
            <Row icon={<ImagesIcon size={13} aria-hidden="true" />}>
              <Link href={albumHref} className="font-medium text-primary hover:underline">
                {item.albumSlug}
              </Link>
            </Row>
            <Row icon={<CalendarDays size={13} aria-hidden="true" />}>
              {pick(item.ago, locale)}
            </Row>
            <Row icon={<Heart size={13} aria-hidden="true" />}>
              {item.likes}{' '}
              <span className="text-subtle-foreground">{t('today.likes')}</span>
            </Row>
            <Row icon={<span className="text-[10px] font-bold">O</span>}>
              {item.orientation === 'landscape' ? 'Landscape' : 'Portrait'}
            </Row>
          </div>

          {/* Tags */}
          {item.tags.length > 0 && (
            <div>
              <p className="mb-2 text-[10px] font-bold uppercase tracking-[.18em] text-subtle-foreground">
                Tag
              </p>
              <div className="flex flex-wrap gap-1.5">
                {item.tags.map((tag) => (
                  <Tag key={tag} size="sm" variant="chip" className="[&:hover]:translate-x-0">
                    {tag}
                  </Tag>
                ))}
              </div>
            </div>
          )}

          {/* Favorite toggle (read-only data, but favorite state can flip) */}
          <button
            type="button"
            aria-pressed={fav}
            onClick={() => toggle(item.src)}
            className={`inline-flex min-h-11 items-center gap-2 rounded-full border px-4 py-2 text-[12px] font-semibold transition ${fav ? 'border-primary/40 bg-primary-subtle text-primary-ink' : 'border-border bg-card text-foreground-strong hover:border-primary/30 hover:text-primary'}`}
          >
            <Heart size={13} fill={fav ? 'currentColor' : 'none'} aria-hidden="true" />
            {fav ? 'Hapus dari favorit' : 'Tambah ke favorit'}
          </button>
        </div>
      </motion.aside>
    </div>
  )
}

function Row({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 text-foreground-strong">
      <span className="grid size-5 place-items-center rounded-md bg-muted text-subtle-foreground">{icon}</span>
      <span>{children}</span>
    </div>
  )
}
