'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Heart,
  ImageOff,
  Share2,
} from 'lucide-react'
import { pick, type Album, type Photo } from '@/lib/data'
import { useFavorites } from '@/lib/favorites'
import { useLocale } from '@/lib/i18n'
import { cn } from '@/lib/utils'
import { Tag } from '@/components/ui/tag'
import { PhotoGrid, type PhotoGridItem } from '@/components/ui/photo-grid'
import { SectionHead } from '@/components/ui/section-head'
import { ThumbnailStrip } from '@/components/ui/thumbnail-strip'

type PhotoViewerProps = {
  slug: string
  album: Album
  photos: Photo[]
  photoId: string
  prevId: string | null
  nextId: string | null
  related: Photo[]
}

const photoUrl = (slug: string, id: string) => `/albums/${slug}/photos/${id}`

export function PhotoViewer({
  slug,
  album,
  photos,
  photoId,
  prevId,
  nextId,
  related,
}: PhotoViewerProps) {
  const { locale, t } = useLocale()
  const router = useRouter()
  const { isFavorite, toggle, ready } = useFavorites()
  const reduceMotion = useReducedMotion()

  const idx = Number(photoId)
  const photo = photos[idx]
  const caption = photo ? pick(photo.caption, locale) : ''
  const fav = ready && photo ? isFavorite(photo.src) : false

  const [imgFailed, setImgFailed] = useState(false)
  const [copied, setCopied] = useState(false)
  const touchStart = useRef<{ x: number; y: number } | null>(null)

  /* ── Reset image error + copied state when photo changes ──── */
  useEffect(() => {
    setImgFailed(false)
    setCopied(false)
  }, [photoId])

  /* ── Auto-scroll the active thumbnail into view ───────────── */
  const stripRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const strip = stripRef.current
    if (!strip) return
    const active = strip.querySelector('a[aria-current="true"]')
    active?.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: reduceMotion ? 'auto' : 'smooth' })
  }, [photoId, reduceMotion])

  /* ── Keyboard shortcuts ─────────────────────────────────────
     ← prev · → next · Esc back · F favorite.
     Cleanup on unmount; skips when a modifier is held. */
  const goPrev = useCallback(() => {
    if (prevId) router.replace(photoUrl(slug, prevId))
  }, [prevId, slug, router])

  const goNext = useCallback(() => {
    if (nextId) router.replace(photoUrl(slug, nextId))
  }, [nextId, slug, router])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return
      if (e.key === 'ArrowLeft') goPrev()
      else if (e.key === 'ArrowRight') goNext()
      else if (e.key === 'Escape') router.back()
      else if (e.key.toLowerCase() === 'f') toggle(photo.src)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [goPrev, goNext, router, toggle, photo])

  /* ── Swipe navigation (mobile) ────────────────────────────── */
  const onTouchStart = (e: React.TouchEvent) => {
    const t = e.touches[0]
    touchStart.current = { x: t.clientX, y: t.clientY }
  }

  const onTouchEnd = (e: React.TouchEvent) => {
    const start = touchStart.current
    touchStart.current = null
    if (!start) return
    const t = e.changedTouches[0]
    const dx = t.clientX - start.x
    const dy = t.clientY - start.y
    // Horizontal dominance + 60px threshold → swipe
    if (Math.abs(dx) > Math.abs(dy) * 1.5 && Math.abs(dx) > 60) {
      if (dx < 0) goNext()
      else goPrev()
    }
  }

  /* ── Share — Web Share API with clipboard fallback ────────── */
  const handleShare = async () => {
    const url = typeof window !== 'undefined' ? window.location.href : photoUrl(slug, photoId)
    try {
      if (navigator.share) {
        await navigator.share({ title: caption, url })
        return
      }
      await navigator.clipboard.writeText(url)
      setCopied(true)
    } catch {
      /* user cancelled share */
    }
  }

  /* ── Presentation-ready derived lists ─────────────────────── */
  const thumbnails = photos.map((p, i) => ({
    src: p.src,
    alt: pick(p.caption, locale),
    href: photoUrl(slug, String(i)),
    active: i === idx,
  }))

  const relatedItems: PhotoGridItem[] = related.map((p, i) => ({
    src: p.src,
    caption: pick(p.caption, locale),
    href: photoUrl(slug, String(idx + 1 + i)),
  }))

  if (!photo) return null // server already guards; defensive only

  return (
    /* Mobile: single column, hero full-bleed (bleeds past main's px-4).
       Desktop: centered max-w-4xl column. */
    <div className="sm:mx-auto sm:max-w-4xl">
      {/* ── Top bar: back + position ─────────────────────────── */}
      <div className="flex items-center justify-between gap-3 pb-3 sm:pb-6">
        <Link
          href={`/albums/${slug}`}
          className="inline-flex min-h-11 items-center gap-2 rounded-full px-3 py-2 text-[12.5px] font-semibold text-foreground-strong transition hover:bg-hover hover:text-primary"
        >
          <ArrowLeft size={15} aria-hidden="true" />
          <span className="max-w-36 truncate sm:max-w-none">{pick(album.title, locale)}</span>
        </Link>
        <p className="shrink-0 font-jp text-[11px] text-subtle-foreground">
          {idx + 1} / {photos.length}
        </p>
      </div>

      {/* ── Hero — full viewport width on mobile ──────────────── */}
      <div
        className="relative -mx-4 sm:mx-0"
        style={{ touchAction: 'pan-y' }}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        {/* Prev / Next arrows — desktop only (mobile uses swipe) */}
        <button
          type="button"
          onClick={goPrev}
          disabled={!prevId}
          aria-label="Foto sebelumnya"
          className="absolute -left-4 top-1/2 z-20 hidden -translate-y-1/2 grid size-11 place-items-center rounded-full border border-border bg-card/80 text-foreground-strong shadow-paper backdrop-blur-md transition hover:border-primary/40 hover:text-primary disabled:pointer-events-none disabled:opacity-40 sm:grid"
        >
          <ChevronLeft size={18} aria-hidden="true" />
        </button>
        <button
          type="button"
          onClick={goNext}
          disabled={!nextId}
          aria-label="Foto berikutnya"
          className="absolute -right-4 top-1/2 z-20 hidden -translate-y-1/2 grid size-11 place-items-center rounded-full border border-border bg-card/80 text-foreground-strong shadow-paper backdrop-blur-md transition hover:border-primary/40 hover:text-primary disabled:pointer-events-none disabled:opacity-40 sm:grid"
        >
          <ChevronRight size={18} aria-hidden="true" />
        </button>

        {/* Image — dark stage. Mobile: full-bleed, tight 4/5 crop, no radius.
            Desktop: rounded, aspect + max-height combo. */}
        <figure className="relative aspect-[4/5] max-h-[50vh] w-full overflow-hidden rounded-[1.35rem] bg-[#17140f] sm:aspect-[4/3] sm:max-h-[60vh] lg:aspect-[16/10] lg:max-h-[70vh]">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={photoId}
              initial={reduceMotion ? false : { opacity: 0, scale: 1.015 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={reduceMotion ? undefined : { opacity: 0 }}
              transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
              className="absolute inset-0"
            >
              {imgFailed ? (
                <div
                  role="status"
                  className="flex size-full flex-col items-center justify-center gap-3 text-on-media-muted"
                >
                  <ImageOff size={40} aria-hidden="true" strokeWidth={1.3} />
                  <p className="font-jp text-[12.5px]">Foto tidak dapat dimuat</p>
                  <button
                    type="button"
                    onClick={() => setImgFailed(false)}
                    className="min-h-11 rounded-full border border-white/25 px-4 py-2 text-[11.5px] font-semibold text-white/85 transition hover:bg-white/10"
                  >
                    Coba lagi
                  </button>
                </div>
              ) : (
                <Image
                  src={photo.src}
                  alt={caption}
                  fill
                  priority
                  sizes="100vw"
                  className="object-cover"
                  onError={() => setImgFailed(true)}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </figure>
      </div>

      {/* ── Caption + metadata — mobile-first reading order ───── */}
      <div
        className="space-y-3 pt-4 sm:space-y-4 sm:pt-6"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        {/* Title */}
        <figcaption className="font-jp text-[17px] font-semibold leading-snug text-foreground-strong sm:text-[15px]">
          {caption}
        </figcaption>

        {/* Tags + meta — one wrapped row on mobile */}
        <div className="flex flex-wrap items-center gap-x-2 gap-y-2">
          {photo.tags.map((tag) => (
            <Tag key={tag} size="sm" variant="chip" className="[&:hover]:translate-x-0">
              {tag}
            </Tag>
          ))}
          <span className="mx-0.5 hidden h-3 w-px bg-border/70 sm:block" aria-hidden="true" />
          <p className="w-full text-[13px] text-muted-foreground sm:w-auto sm:text-[11.5px]">
            {pick(photo.ago, locale)} · {photo.likes}{' '}
            <span className="text-subtle-foreground">{t('today.likes')}</span>
          </p>
        </div>

        {/* Actions — mobile: full-width row under meta. Desktop: right-aligned icons. */}
        <div className="flex gap-2.5 border-t border-border/60 pt-3 sm:justify-end sm:gap-2 sm:border-0 sm:pt-0">
          <button
            type="button"
            onClick={() => toggle(photo.src)}
            aria-label={fav ? t('favorites.remove') : t('favorites.add')}
            aria-pressed={fav}
            className={cn(
              'flex min-h-11 flex-1 items-center justify-center gap-2 rounded-full border px-4 py-2.5 text-[12.5px] font-semibold transition duration-300 sm:size-11 sm:flex-none sm:shrink-0 sm:px-0 sm:py-0',
              fav
                ? 'border-primary/40 bg-primary-subtle text-primary-ink'
                : 'border-border bg-card text-muted-foreground hover:text-primary',
            )}
          >
            <Heart size={16} fill={fav ? 'currentColor' : 'none'} aria-hidden="true" className={`transition-transform duration-300 ${fav ? 'scale-110' : 'scale-100'}`} />
            <span className="sm:hidden">{fav ? t('favorites.remove') : t('favorites.add')}</span>
          </button>

          <button
            type="button"
            onClick={handleShare}
            aria-label="Bagikan foto"
            className="flex min-h-11 flex-1 items-center justify-center gap-2 rounded-full border border-border bg-card px-4 py-2.5 text-[12.5px] font-semibold text-muted-foreground transition duration-300 hover:text-primary sm:size-11 sm:flex-none sm:shrink-0 sm:px-0 sm:py-0"
          >
            <Share2 size={16} aria-hidden="true" />
            <span className="sm:hidden">Bagikan</span>
          </button>
        </div>

        {/* Copy feedback — polite live region */}
        <p aria-live="polite" className="sr-only">
          {copied ? 'Tautan disalin' : ''}
        </p>
      </div>

      {/* ── Thumbnail strip — tight spacing on mobile ────────── */}
      <div className="pt-5 sm:pt-8" ref={stripRef}>
        <ThumbnailStrip
          thumbnails={thumbnails}
          label="Semua foto dalam album"
          className="-mx-4 gap-2 px-4 [scroll-snap-type:x_proximity] sm:mx-0 sm:gap-2.5 sm:px-0 [&_a]:[scroll-snap-align:start]"
        />
      </div>

      {/* ── Related photos ───────────────────────────────────── */}
      {related.length > 0 && (
        <section aria-label="Foto terkait" className="pt-6 sm:pt-10">
          <SectionHead title="Foto Terkait" />
          <div className="mt-4 sm:mt-6">
            <PhotoGrid photos={relatedItems} />
          </div>
        </section>
      )}
    </div>
  )
}
