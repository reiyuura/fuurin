'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { CheckSquare, Images as ImagesIcon, Search, Square, X } from 'lucide-react'
import { pick } from '@/lib/data'
import { filterPhotos } from '@/lib/search-utils'
import { buildMediaAlbumOptions, buildMediaTagOptions, sortMedia, type MediaSortKey } from '@/lib/media-utils'
import type { MediaItem } from '@/types/media'
import { useFavorites } from '@/lib/favorites'
import { useLocale, type Locale } from '@/lib/i18n'
import { MediaGrid } from '@/components/media/media-grid'
import { MediaSelectionBar } from '@/components/media/media-selection-bar'
import { MediaDetails } from '@/components/media/media-details'
import { AlbumEmptyState } from '@/components/ui/album-empty-state'
import { Dropdown } from '@/components/ui/dropdown'

const PAGE_SIZE = 24
const SORT_OPTIONS: { value: MediaSortKey; labelId: string }[] = [
  { value: 'newest', labelId: 'media.sort.newest' },
  { value: 'oldest', labelId: 'media.sort.oldest' },
  { value: 'name-az', labelId: 'media.sort.name-az' },
  { value: 'name-za', labelId: 'media.sort.name-za' },
]

type MediaExplorerProps = {
  /** Full flat list — server-prepared. */
  items: MediaItem[]
}

export function MediaExplorer({ items }: MediaExplorerProps) {
  const { locale, t } = useLocale()
  const router = useRouter()
  const searchParams = useSearchParams()
  const { isFavorite } = useFavorites()

  /* ── URL state ─────────────────────────────────────────────── */
  const q = searchParams.get('q') ?? ''
  const albumSlug = searchParams.get('album') ?? ''
  const tag = searchParams.get('tag') ?? ''
  const orient = searchParams.get('orient') ?? ''
  const fav = searchParams.get('fav') === '1'
  const sort = (searchParams.get('sort') ?? 'newest') as MediaSortKey

  /* ── Selection (NOT in URL — per spec) ────────────────────── */
  const [selectedIds, setSelectedIds] = useState<ReadonlySet<string>>(() => new Set())
  const [selectionMode, setSelectionMode] = useState(false)

  /* ── Details drawer — lazy mounted (null when inactive) ───── */
  const [detailsId, setDetailsId] = useState<string | null>(null)

  /* ── Debounced search input ────────────────────────────────── */
  const [searchInput, setSearchInput] = useState(q)
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchInput !== q) setQuery({ q: searchInput })
    }, 250)
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchInput])
  useEffect(() => {
    setSearchInput(q)
  }, [q])

  /* ── URL sync helper (mirrors AlbumsExplorer pattern) ─────── */
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
      if (v === null || v === '' || v === 'all') next.delete(k)
      else next.set(k, v)
    }
    // Add 'fav=1' when truthy, remove otherwise
    if ('fav' in patch) {
      if (patch.fav === '1') next.set('fav', '1')
      else next.delete('fav')
    }
    syncParams(next)
  }

  /* ── Filtered + sorted items (pure pipeline) ───────────────── */
  const filtered = useMemo(() => {
    const searchHit = q.trim()
      ? items.filter((it) => {
          const caption = (pick(it.caption, locale) || '').toLowerCase()
          const tags = it.tags.map((tg) => tg.toLowerCase())
          const album = it.albumSlug.toLowerCase()
          const needle = q.trim().toLowerCase()
          return (
            caption.includes(needle) ||
            tags.some((tg) => tg.includes(needle)) ||
            album.includes(needle)
          )
        })
      : items

    // filterPhotos expects {album, ...}; MediaItem uses albumSlug.
    const photoFilt = filterPhotos(
      searchHit.map((it) => ({
        src: it.src,
        album: it.albumSlug,
        tags: it.tags,
        orientation: it.orientation,
      })),
      {
        tag: tag || undefined,
        album: albumSlug || undefined,
        orientation: orient === 'landscape' || orient === 'portrait' ? orient : undefined,
        favorite: fav || undefined,
      },
      isFavorite,
    )

    const allowed = new Set(photoFilt.map((p) => p.src))
    const filteredItems = searchHit.filter((it) => allowed.has(it.src))

    return sortMedia(filteredItems, sort, locale as Locale)
  }, [items, q, tag, albumSlug, orient, fav, sort, locale, isFavorite])

  /* ── Derived filter options ────────────────────────────────── */
  const albumOptions = useMemo(() => buildMediaAlbumOptions(items), [items])
  const tagOptions = useMemo(() => buildMediaTagOptions(items), [items])

  /* ── Infinite scroll ──────────────────────────────────────── */
  const [visible, setVisible] = useState(PAGE_SIZE)
  const sentinelRef = useRef<HTMLDivElement>(null)

  // Reset pagination on filter change.
  useEffect(() => {
    setVisible(PAGE_SIZE)
  }, [q, tag, albumSlug, orient, fav, sort])

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

  const visibleItems = useMemo(() => filtered.slice(0, visible), [filtered, visible])
  const hasMore = visible < filtered.length

  /* ── Selection handlers ───────────────────────────────────── */
  const toggleSelection = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleSelectionMode = () => {
    if (selectionMode) {
      setSelectionMode(false)
      setSelectedIds(new Set())
    } else {
      setSelectionMode(true)
    }
  }

  /* ── Mock actions (read-only data — no real side effects) ─── */
  const handleMockAction = (label: string) => {
    if (typeof window === 'undefined') return
    window.alert(`${label}: ${selectedIds.size} foto`)
  }

  /* ── Details drawer target ────────────────────────────────── */
  const detailsItem = useMemo(
    () => (detailsId ? items.find((it) => it.id === detailsId) ?? null : null),
    [detailsId, items],
  )

  /* ── PhotoGridItem presentation mapping (MediaGrid handles this)
        but we still need the items in array form for MediaGrid. */
  const gridItems = visibleItems

  return (
    <div className="space-y-6">
      {/* ── Toolbar ────────────────────────────────────────── */}
      <div className="space-y-3">
        {/* Search + Selection toggle row */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
          <label className="relative flex-1">
            <Search
              size={15}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-subtle-foreground"
              aria-hidden="true"
            />
            <input
              type="search"
              role="searchbox"
              aria-label={t('media.searchPlaceholder')}
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder={t('media.searchPlaceholder')}
              className="min-h-11 w-full rounded-full border border-border bg-card pl-10 pr-4 text-[13px] text-foreground-strong outline-none transition focus-visible:border-primary/50"
            />
          </label>

          <button
            type="button"
            aria-pressed={selectionMode}
            onClick={toggleSelectionMode}
            className={`inline-flex h-11 items-center gap-2 self-start rounded-full border px-4 text-[12px] font-semibold transition sm:self-auto ${selectionMode ? 'border-primary/40 bg-primary-subtle text-primary-ink' : 'border-border bg-card text-foreground-strong hover:border-primary/30 hover:text-primary'}`}
          >
            {selectionMode ? <CheckSquare size={14} aria-hidden="true" /> : <Square size={14} aria-hidden="true" />}
            {selectionMode ? t('media.selection.cancel') : t('media.selection.toggle')}
          </button>
        </div>

        {/* Filter + Sort row */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Album select */}
          <label className="relative">
            <span className="sr-only">{t('media.albums')}</span>
            <select
              value={albumSlug}
              onChange={(e) => setQuery({ album: e.target.value })}
              className="h-10 appearance-none rounded-full border border-border bg-card px-4 pr-8 text-[12px] font-medium text-foreground-strong outline-none transition focus-visible:border-primary/50"
            >
              <option value="">{t('media.allAlbums')}</option>
              {albumOptions.map((opt) => (
                <option key={opt.slug} value={opt.slug}>
                  {opt.slug} · {opt.count}
                </option>
              ))}
            </select>
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-subtle-foreground">
              ▾
            </span>
          </label>

          {/* Tag select */}
          <label className="relative">
            <span className="sr-only">Tag</span>
            <select
              value={tag}
              onChange={(e) => setQuery({ tag: e.target.value })}
              className="h-10 appearance-none rounded-full border border-border bg-card px-4 pr-8 text-[12px] font-medium text-foreground-strong outline-none transition focus-visible:border-primary/50"
            >
              <option value="">Semua tag</option>
              {tagOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-subtle-foreground">
              ▾
            </span>
          </label>

          {/* Orientation pills */}
          {(['', 'landscape', 'portrait'] as const).map((o) => {
            const active = orient === o
            return (
              <button
                key={o || 'all'}
                type="button"
                aria-pressed={active}
                onClick={() => setQuery({ orient: o })}
                className={`inline-flex h-10 items-center gap-1.5 rounded-full border px-3.5 text-[12px] font-semibold transition ${active ? 'border-primary/40 bg-primary-subtle text-primary-ink' : 'border-border bg-card text-foreground-strong hover:border-primary/30 hover:text-primary'}`}
              >
                {o === '' ? 'Semua' : o === 'landscape' ? 'Landscape' : 'Portrait'}
              </button>
            )
          })}

          {/* Favorite toggle */}
          <button
            type="button"
            aria-pressed={fav}
            onClick={() => setQuery({ fav: fav ? '0' : '1' })}
            className={`inline-flex h-10 items-center gap-1.5 rounded-full border px-3.5 text-[12px] font-semibold transition ${fav ? 'border-primary/40 bg-primary-subtle text-primary-ink' : 'border-border bg-card text-foreground-strong hover:border-primary/30 hover:text-primary'}`}
          >
            ♥ Favorit
          </button>

          {/* Clear all filters */}
          {(q || albumSlug || tag || orient || fav) && (
            <button
              onClick={() => {
                setSearchInput('')
                setQuery({ q: '', album: '', tag: '', orient: '', fav: '0' })
              }}
              className="inline-flex h-10 items-center gap-1.5 rounded-full px-3 text-[12px] font-semibold text-primary transition hover:bg-primary-subtle/50"
            >
              <X size={12} aria-hidden="true" />
              Bersihkan filter
            </button>
          )}

          <div className="ml-auto">
            <SortDropdown active={sort} onChange={(v) => setQuery({ sort: v === 'newest' ? '' : v })} />
          </div>
        </div>
      </div>

      {/* Result counter — live region */}
      <p
        aria-live="polite"
        className="text-[11px] font-medium tracking-wide text-muted-foreground"
      >
        {filtered.length} foto
      </p>

      {/* Grid */}
      {filtered.length === 0 ? (
        <AlbumEmptyState
          illustration="search"
          title={t('media.empty.title')}
          description={t('media.empty.desc')}
          action={{
            label: 'Reset Filter',
            variant: 'secondary',
            onClick: () => {
              setSearchInput('')
              setQuery({ q: '', album: '', tag: '', orient: '', fav: '0' })
            },
          }}
          className="py-20"
        />
      ) : (
        <MediaGrid
          items={gridItems}
          selectable={selectionMode}
          selectedIds={selectedIds}
          onToggleSelect={toggleSelection}
        />
      )}

      {/* Sentinel + end-of-list message */}
      <div ref={sentinelRef} aria-hidden="true" className="h-px" />
      {filtered.length > 0 && !hasMore && (
        <p className="text-center font-jp text-[11px] text-subtle-foreground">
          すべての写真を表示しました · Semua foto sudah dimuat
        </p>
      )}

      {/* Selection bar (sticky bottom) — only when items are selected */}
      {selectionMode && selectedIds.size > 0 && (
        <MediaSelectionBar
          count={selectedIds.size}
          onClear={() => setSelectedIds(new Set())}
          onCancel={() => {
            setSelectionMode(false)
            setSelectedIds(new Set())
          }}
          onFavorite={() => handleMockAction(t('media.action.favorite'))}
          onAddTag={() => handleMockAction(t('media.action.tag'))}
          onDelete={() => handleMockAction(t('media.confirm.delete').replace('{n}', String(selectedIds.size)))}
        />
      )}

      {/* Lazy-mounted details drawer */}
      <MediaDetails item={detailsItem} onClose={() => setDetailsId(null)} />

      {/* Bottom padding when selection bar is visible so the last row isn't covered */}
      {selectionMode && selectedIds.size > 0 && <div aria-hidden="true" className="h-20" />}
    </div>
  )
}

/* ── Sort dropdown ─────────────────────────────────────────────── */

function SortDropdown({
  active,
  onChange,
}: {
  active: MediaSortKey
  onChange: (v: MediaSortKey) => void
}) {
  const { t } = useLocale()
  const [open, setOpen] = useState(false)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const selected = SORT_OPTIONS.find((o) => o.value === active) ?? SORT_OPTIONS[0]

  useEffect(() => {
    if (!open) return
    const close = () => setOpen(false)
    window.addEventListener('click', close)
    return () => window.removeEventListener('click', close)
  }, [open])

  return (
    <div className="relative">
      <button
        ref={triggerRef}
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          setOpen((v) => !v)
        }}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`Urutkan: ${t(selected.labelId as 'media.sort.newest')}`}
        className="inline-flex h-10 min-w-[120px] items-center gap-2 rounded-full border border-border bg-card px-4 text-[12px] font-semibold text-foreground-strong transition hover:border-primary/35"
      >
        <ImagesIcon size={13} className="shrink-0 text-subtle-foreground" aria-hidden="true" />
        <span className="flex-1 text-left">{t(selected.labelId as 'media.sort.newest')}</span>
        <span className="text-subtle-foreground">▾</span>
      </button>
      {open && (
        <Dropdown role="listbox" onClick={(e) => e.stopPropagation()} className="min-w-[180px]">
          {SORT_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              role="option"
              aria-selected={opt.value === active}
              onClick={() => {
                onChange(opt.value)
                setOpen(false)
              }}
              className={`flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-[12px] transition ${opt.value === active ? 'bg-primary-subtle font-semibold text-primary-ink' : 'font-medium text-foreground-strong hover:bg-hover'}`}
            >
              {t(opt.labelId as 'media.sort.newest')}
              {opt.value === active && <span aria-hidden="true">✓</span>}
            </button>
          ))}
        </Dropdown>
      )}
    </div>
  )
}
