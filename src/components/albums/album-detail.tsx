'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { CalendarDays, Eye, Heart, Images as ImagesIcon, Mountain, Pencil } from 'lucide-react'
import { pick, type Album, type Photo } from '@/lib/data'
import { buildTagOptions } from '@/lib/album-utils'
import { filterPhotos, sortPhotos, type PhotoFilter, type PhotoSortKey } from '@/lib/search-utils'
import { useFavorites } from '@/lib/favorites'
import { useLocale } from '@/lib/i18n'
import { useSession } from '@/components/auth/session-provider'
import { canEditAlbums } from '@/lib/auth/permissions'
import { AlbumFilter } from '@/components/ui/album-filter'
import { AlbumGrid } from '@/components/ui/album-grid'
import { PhotoGrid, type PhotoGridItem } from '@/components/ui/photo-grid'
import { SectionHead } from '@/components/ui/section-head'

const PAGE_SIZE = 12
const ORIENTATIONS: Array<'all' | 'landscape' | 'portrait'> = ['all', 'landscape', 'portrait']
const SORTS: Array<PhotoSortKey> = ['newest', 'oldest', 'popular']

type AlbumDetailProps = {
  album: Album
  /** Raw photos for this album — caption/tag resolution done here. */
  photos: Photo[]
  /** Raw related albums — mapped to presentation-ready in this component. */
  related: Album[]
}

const SEASON_LABELS: Record<Album['season'], string> = {
  spring: 'Spring',
  summer: 'Summer',
  autumn: 'Autumn',
  winter: 'Winter',
}

export function AlbumDetail({ album, photos, related }: AlbumDetailProps) {
  const { locale } = useLocale()
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user } = useSession()
  const showEdit = canEditAlbums(user)
  const { isFavorite } = useFavorites()

  /* ── URL state ─────────────────────────────────────────────── */
  const tag = searchParams.get('tag') ?? 'all'
  const fav = searchParams.get('fav') === '1'
  const orient = (searchParams.get('orient') ?? 'all') as 'all' | 'landscape' | 'portrait'
  const sort = (searchParams.get('sort') ?? 'newest') as PhotoSortKey

  /* Skip no-op replaces (mirrors albums-explorer pattern). */
  const prevParams = useRef('')
  function syncParams(next: URLSearchParams) {
    const qs = next.toString()
    const url = qs ? `${window.location.pathname}?${qs}` : window.location.pathname
    if (url === prevParams.current) return
    prevParams.current = url
    router.replace(url, { scroll: false })
  }
  function setQuery(patch: Record<string, string | null>) {
    const next = new URLSearchParams(searchParams.toString())
    for (const [k, v] of Object.entries(patch)) {
      if (v === null || v === '' || v === 'all' || (k === 'fav' && v === '0')) next.delete(k)
      else next.set(k, v)
    }
    syncParams(next)
  }

  /* ── Tag filter (existing UX) + new photo filters ─────────── */
  const tagOptions = useMemo(() => buildTagOptions(photos), [photos])

  const filter: PhotoFilter = useMemo(
    () => ({
      tag,
      favorite: fav || undefined,
      orientation: orient === 'all' ? undefined : orient,
    }),
    [tag, fav, orient],
  )

  const filtered = useMemo(
    () => sortPhotos(filterPhotos(photos, filter, isFavorite), sort),
    [photos, filter, sort, isFavorite],
  )

  /* ── Infinite scroll — sentinel at the bottom of the grid ──── */
  const [visible, setVisible] = useState(PAGE_SIZE)
  const sentinelRef = useRef<HTMLDivElement>(null)

  // Reset pagination when any filter changes.
  useEffect(() => {
    setVisible(PAGE_SIZE)
  }, [tag, fav, orient, sort])

  useEffect(() => {
    const el = sentinelRef.current
    if (!el || visible >= filtered.length) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible((v) => Math.min(v + PAGE_SIZE, filtered.length))
        }
      },
      { rootMargin: '400px 0px' },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [visible, filtered.length])

  const visiblePhotos = useMemo(
    () => filtered.slice(0, visible),
    [filtered, visible],
  )

  /* ── Presentation-ready mapping ──────────────────────────────
     href uses the photo's index in the FULL album list, so the
     viewer's prev/next walk the whole album, not the filtered slice. */
  const photoItems: PhotoGridItem[] = useMemo(
    () =>
      visiblePhotos.map((p) => {
        const fullIndex = photos.indexOf(p)
        return {
          src: p.src,
          caption: pick(p.caption, locale),
          href: `/albums/${album.slug}/photos/${fullIndex}`,
        }
      }),
    [visiblePhotos, photos, locale, album.slug],
  )

  const relatedItems = useMemo(
    () =>
      related.map((a) => ({
        slug: a.slug,
        cover: a.cover,
        title: pick(a.title, locale),
        date: pick(a.period, locale),
        photoCount: a.count,
      })),
    [related, locale],
  )

  const hasMore = visible < filtered.length

  return (
    <div className="space-y-12">
      {/* ── Cover + information ───────────────────────────────── */}
      <section className="relative overflow-hidden rounded-[2rem] border border-white/[0.08] shadow-[0_18px_52px_rgba(0,0,0,0.28)]">
        <Image
          src={album.cover}
          alt={pick(album.title, locale)}
          fill
          sizes="(max-width: 1400px) 100vw, 1400px"
          priority
          className="object-cover opacity-85"
        />
        <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(44,30,28,0.72)_0%,rgba(48,34,32,0.78)_50%,rgba(40,28,26,0.68)_100%)]" />

        <div className="relative flex min-h-[220px] items-end px-5 py-6 sm:min-h-[300px] sm:px-10 sm:py-12">
          <div className="max-w-2xl">
            <p className="mb-2 text-[10px] font-bold uppercase tracking-[.22em] text-white/70 sm:mb-2.5 sm:text-[10.5px]">
              {SEASON_LABELS[album.season]} · {album.category}
            </p>
            <h1 className="break-words font-jp text-[22px] font-bold leading-[1.25] tracking-tight text-white drop-shadow-[0_2px_10px_rgba(0,0,0,0.4)] sm:text-[32px] lg:text-[38px]">
              {pick(album.title, locale)}
            </h1>

            <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-white/70 sm:mt-4">
              <span className="inline-flex items-center gap-1.5 text-[11.5px] sm:text-[12px]">
                <CalendarDays size={13} aria-hidden="true" />
                {pick(album.period, locale)}
              </span>
              <span className="inline-flex items-center gap-1.5 text-[11.5px] sm:text-[12px]">
                <ImagesIcon size={13} aria-hidden="true" />
                {album.count} foto
              </span>
              <span className="inline-flex items-center gap-1.5 text-[11.5px] sm:text-[12px]">
                <Eye size={13} aria-hidden="true" />
                {album.views >= 1000
                  ? `${(album.views / 1000).toFixed(1)}k`
                  : album.views}{' '}
                dilihat
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* ── Filter + photo grid ───────────────────────────────── */}
      <section aria-label="Foto album">
        {/* Tag pills — existing UX */}
        <AlbumFilter
          categories={tagOptions}
          active={tag}
          onChange={(v) => setQuery({ tag: v === 'all' ? null : v })}
        />

        {/* Photo filters: favorite + orientation + sort — combinable */}
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <button
            type="button"
            aria-pressed={fav}
            onClick={() => setQuery({ fav: fav ? '0' : '1' })}
            className={`inline-flex h-10 items-center gap-1.5 rounded-full border px-3.5 text-xs font-semibold transition ${fav ? 'border-primary/40 bg-primary-subtle text-primary-ink' : 'border-border bg-card text-foreground-strong hover:border-primary/30 hover:text-primary'}`}
          >
            <Heart size={12} fill={fav ? 'currentColor' : 'none'} aria-hidden="true" />
            Favorit
          </button>

          {ORIENTATIONS.map((o) => {
            const active = orient === o
            const Icon = o === 'portrait' ? ImagesIcon : Mountain
            const label = o === 'all' ? 'Semua' : o === 'landscape' ? 'Landscape' : 'Portrait'
            return (
              <button
                key={o}
                type="button"
                aria-pressed={active}
                onClick={() => setQuery({ orient: active ? null : o })}
                className={`inline-flex h-10 items-center gap-1.5 rounded-full border px-3.5 text-xs font-semibold transition ${active ? 'border-primary/40 bg-primary-subtle text-primary-ink' : 'border-border bg-card text-foreground-strong hover:border-primary/30 hover:text-primary'}`}
              >
                {o !== 'all' && <Icon size={12} aria-hidden="true" />}
                {label}
              </button>
            )
          })}

          <div className="ml-auto flex items-center gap-1.5">
            <label htmlFor="photo-sort" className="sr-only">Sort</label>
            <select
              id="photo-sort"
              value={sort}
              onChange={(e) => setQuery({ sort: e.target.value === 'newest' ? null : e.target.value })}
              className="h-10 rounded-full border border-border bg-card px-3 text-xs font-medium text-foreground-strong outline-none transition focus-visible:border-primary/50"
            >
              {SORTS.map((s) => (
                <option key={s} value={s}>
                  {s === 'newest' ? 'Terbaru' : s === 'oldest' ? 'Terlama' : 'Populer'}
                </option>
              ))}
            </select>
            {/* Editor shortcut — only for roles that can actually edit
                (guests/viewer used to see it and bounced off the login gate). */}
            {showEdit && (
              <Link
                href={`/editor/albums/${album.slug}`}
                className="inline-flex h-10 items-center gap-1.5 rounded-full border border-border bg-card px-3 text-xs font-semibold text-foreground-strong transition hover:border-primary/50 hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                aria-label={`Edit album ${pick(album.title, locale)}`}
              >
                <Pencil size={12} aria-hidden="true" /> Edit
              </Link>
            )}
          </div>
        </div>

        <div className="mt-6">
          <PhotoGrid photos={photoItems} />
        </div>

        {/* Sentinel — IntersectionObserver loads the next page */}
        <div ref={sentinelRef} aria-hidden="true" className="h-px" />
        {!hasMore && (
          <p className="mt-8 text-center font-jp text-[11px] text-subtle-foreground">
            すべての写真を表示しました · Semua foto sudah dimuat
          </p>
        )}
      </section>

      {/* ── Related albums ────────────────────────────────────── */}
      {related.length > 0 && (
        <section aria-label="Album terkait">
          <SectionHead
            title="Album Lainnya"
            href="/albums"
            linkLabel="Lihat semua"
          />
          <AlbumGrid albums={relatedItems} />
        </section>
      )}
    </div>
  )
}
