'use client'

/**
 * PhotoPicker — render-only multi-select media picker.
 *
 * Reuses filter/sort/search utilities from Sprint 9 (filterPhotos,
 * sortPhotos, buildMediaAlbumOptions, buildMediaTagOptions). State is
 * local — parent receives the picked ids via `onPick`.
 *
 * `useDeferredValue` is applied to the search input only — the form
 * stays instant on title/description.
 */

import { useDeferredValue, useEffect, useMemo, useState } from 'react'
import { CheckSquare, Search, Square, X } from 'lucide-react'
import { pick } from '@/lib/data'
import {
  buildMediaAlbumOptions,
  buildMediaTagOptions,
  type MediaSortKey,
} from '@/lib/media-utils'
import { useLocale, type Locale } from '@/lib/i18n'
import { Button } from '@/components/ui/button'
import { MediaGrid } from '@/components/media/media-grid'
import { AlbumEmptyState } from '@/components/ui/album-empty-state'
import type { MediaItem } from '@/types/media'

const PAGE_SIZE = 24
const SORT_OPTIONS: { value: MediaSortKey; label: string }[] = [
  { value: 'newest', label: 'Terbaru' },
  { value: 'oldest', label: 'Terlama' },
  { value: 'name-az', label: 'A → Z' },
  { value: 'name-za', label: 'Z → A' },
]
type PhotoSortKey = 'newest' | 'oldest' | 'popular'
const PHOTO_SORTS: { value: PhotoSortKey; label: string }[] = [
  { value: 'newest', label: 'Terbaru' },
  { value: 'oldest', label: 'Terlama' },
  { value: 'popular', label: 'Paling disukai' },
]

function applyFilters(items: MediaItem[], q: string, opts: { album: string; tag: string; orient: 'all' | 'landscape' | 'portrait' }): MediaItem[] {
  const query = q.trim().toLowerCase()
  return items.filter((m) => {
    if (opts.album !== 'all' && m.albumSlug !== opts.album) return false
    if (opts.tag !== 'all' && !m.tags.includes(opts.tag)) return false
    if (opts.orient !== 'all' && m.orientation !== opts.orient) return false
    if (query) {
      const hay = [pick(m.caption, 'ja'), pick(m.caption, 'id'), pick(m.caption, 'en')]
        .join(' ')
        .toLowerCase()
      if (!hay.includes(query)) return false
    }
    return true
  })
}

function applySort(items: MediaItem[], sort: MediaSortKey, photoSort: PhotoSortKey, locale: Locale): MediaItem[] {
  const primary = (() => {
    const arr = [...items]
    switch (sort) {
      case 'newest':
        return arr.sort((a, b) => b.date.localeCompare(a.date) || b.idx - a.idx)
      case 'oldest':
        return arr.sort((a, b) => a.date.localeCompare(a.date) || a.idx - b.idx)
      case 'name-az':
        return arr.sort((a, b) => pick(a.caption, locale).localeCompare(pick(b.caption, locale), locale))
      case 'name-za':
        return arr.sort((a, b) => pick(b.caption, locale).localeCompare(pick(a.caption, locale), locale))
    }
  })()
  switch (photoSort) {
    case 'popular':
      return [...primary].sort((a, b) => b.likes - a.likes)
    case 'oldest':
      return [...primary].reverse()
    case 'newest':
    default:
      return primary
  }
}

export type PhotoPickerProps = {
  items: MediaItem[]
  selectedIds: ReadonlySet<string>
  onPick: (ids: string[]) => void
  onClose: () => void
}

export function PhotoPicker({ items, selectedIds, onPick, onClose }: PhotoPickerProps) {
  const { locale } = useLocale()

  /* ── Local picker state ─────────────────────────────────────── */
  const [query, setQuery] = useState('')
  const deferredQuery = useDeferredValue(query)
  const [albumFilter, setAlbumFilter] = useState<string>('all')
  const [tagFilter, setTagFilter] = useState<string>('all')
  const [orientFilter, setOrientFilter] = useState<'all' | 'landscape' | 'portrait'>('all')
  const [sort, setSort] = useState<MediaSortKey>('newest')
  const [photoSort, setPhotoSort] = useState<PhotoSortKey>('newest')
  const [draftSelection, setDraftSelection] = useState<ReadonlySet<string>>(
    () => new Set(selectedIds),
  )
  const [visible, setVisible] = useState(PAGE_SIZE)

  // Reset pagination when filters change.
  useEffect(() => {
    setVisible(PAGE_SIZE)
  }, [deferredQuery, albumFilter, tagFilter, orientFilter, sort, photoSort])

  // Esc to close.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  /* ── Derived lists ──────────────────────────────────────────── */
  const albumOptions = useMemo(() => buildMediaAlbumOptions(items), [items])
  const tagOptions = useMemo(() => buildMediaTagOptions(items), [items])

  const filtered = useMemo(
    () =>
      applyFilters(items, deferredQuery, {
        album: albumFilter,
        tag: tagFilter,
        orient: orientFilter,
      }),
    [items, deferredQuery, albumFilter, tagFilter, orientFilter],
  )

  const sorted = useMemo(
    () => applySort(filtered, sort, photoSort, locale),
    [filtered, sort, photoSort, locale],
  )

  const visibleItems = useMemo(() => sorted.slice(0, visible), [sorted, visible])
  const hasMore = visible < sorted.length

  /* ── Selection helpers ──────────────────────────────────────── */
  function toggle(id: string) {
    setDraftSelection((s) => {
      const next = new Set(s)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function selectAllVisible() {
    setDraftSelection((s) => {
      const next = new Set(s)
      for (const m of visibleItems) next.add(m.id)
      return next
    })
  }

  function clearVisible() {
    setDraftSelection((s) => {
      const next = new Set(s)
      for (const m of visibleItems) next.delete(m.id)
      return next
    })
  }

  function commit() {
    onPick([...draftSelection])
  }

  const newCount = useMemo(() => {
    let n = 0
    for (const id of draftSelection) if (!selectedIds.has(id)) n++
    return n
  }, [draftSelection, selectedIds])

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="photo-picker-title"
      className="fixed inset-0 z-50 flex items-end justify-center sm:items-center"
    >
      <button
        type="button"
        aria-label="Tutup pemilih foto"
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="card-paper relative z-10 flex h-[92vh] w-full flex-col overflow-hidden rounded-t-[1.5rem] border border-border shadow-[0_-12px_50px_rgba(0,0,0,0.18)] sm:h-[88vh] sm:max-w-5xl sm:rounded-[1.5rem]">
        <header className="flex items-center justify-between gap-2 border-b border-border/60 px-4 py-3 sm:px-6 sm:py-4">
          <div>
            <h3
              id="photo-picker-title"
              className="font-jp text-[14px] font-bold tracking-tight text-foreground-strong sm:text-[15px]"
            >
              Pilih Foto untuk Album
            </h3>
            <p className="mt-0.5 text-[11.5px] text-muted-foreground">
              {draftSelection.size} dipilih
              {newCount > 0 && (
                <span className="ml-1.5 rounded-full bg-primary/15 px-2 py-0.5 font-semibold text-primary">
                  +{newCount} baru
                </span>
              )}
            </p>
          </div>
          <Button type="button" variant="ghost" size="icon-sm" onClick={onClose} aria-label="Tutup">
            <X size={16} aria-hidden="true" />
          </Button>
        </header>

        {/* Toolbar — search + filters */}
        <div className="flex flex-wrap items-center gap-2 border-b border-border/40 bg-background/30 px-4 py-3 sm:px-6">
          <div className="relative min-w-[200px] flex-1">
            <Search
              size={14}
              aria-hidden="true"
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/70"
            />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Cari caption…"
              className="w-full rounded-[12px] border border-border bg-background/60 py-2 pl-9 pr-3 text-[13px] focus:border-primary/60 focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
          <FilterSelect
            value={albumFilter}
            onChange={setAlbumFilter}
            aria-label="Filter album"
            options={[
              { value: 'all', label: 'Semua album' },
              ...albumOptions.map((o) => ({ value: o.slug, label: `${o.slug} · ${o.count}` })),
            ]}
          />
          <FilterSelect
            value={tagFilter}
            onChange={setTagFilter}
            aria-label="Filter tag"
            options={[
              { value: 'all', label: 'Semua tag' },
              ...tagOptions.map((t) => ({ value: t, label: t })),
            ]}
          />
          <FilterSelect
            value={orientFilter}
            onChange={(v) => setOrientFilter(v as 'all' | 'landscape' | 'portrait')}
            aria-label="Orientasi"
            options={[
              { value: 'all', label: 'Semua orientasi' },
              { value: 'landscape', label: 'Landscape' },
              { value: 'portrait', label: 'Portrait' },
            ]}
          />
          <FilterSelect
            value={sort}
            onChange={(v) => setSort(v as MediaSortKey)}
            aria-label="Urutkan"
            options={SORT_OPTIONS}
          />
          <FilterSelect
            value={photoSort}
            onChange={(v) => setPhotoSort(v as PhotoSortKey)}
            aria-label="Urutkan popularitas"
            options={PHOTO_SORTS}
          />
          <div className="flex items-center gap-1">
            <Button type="button" variant="ghost" size="xs" onClick={selectAllVisible}>
              <CheckSquare size={12} aria-hidden="true" /> Pilih halaman
            </Button>
            <Button type="button" variant="ghost" size="xs" onClick={clearVisible}>
              <Square size={12} aria-hidden="true" /> Bersihkan halaman
            </Button>
          </div>
        </div>

        {/* Grid */}
        <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-6 sm:py-5">
          {visibleItems.length === 0 ? (
            <AlbumEmptyState
              title="Tidak ada foto"
              description="Coba ubah pencarian atau filter."
            />
          ) : (
            <MediaGrid
              items={visibleItems}
              selectable
              selectedIds={draftSelection}
              onToggleSelect={toggle}
            />
          )}
          {hasMore && (
            <div className="mt-4 flex justify-center">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setVisible((v) => v + PAGE_SIZE)}
              >
                Muat {Math.min(PAGE_SIZE, sorted.length - visible)} lagi
              </Button>
            </div>
          )}
        </div>

        {/* Footer */}
        <footer
          className="flex items-center justify-between gap-2 border-t border-border/60 bg-background/40 px-4 py-3 sm:px-6 sm:py-4"
          style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 12px)' }}
        >
          <p className="text-[11.5px] text-muted-foreground">
            Klik foto untuk memilih. Pilih halaman menerapkan ke foto yang terlihat.
          </p>
          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" size="sm" onClick={onClose}>
              Batal
            </Button>
            <Button type="button" size="sm" onClick={commit}>
              Tambahkan {newCount > 0 ? `${newCount} foto` : ''}
            </Button>
          </div>
        </footer>
      </div>
    </div>
  )
}

type FilterSelectProps<T extends string> = {
  value: T
  onChange: (v: T) => void
  options: { value: T; label: string }[]
  'aria-label'?: string
}

function FilterSelect<T extends string>({
  value,
  onChange,
  options,
  ...rest
}: FilterSelectProps<T>) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as T)}
      aria-label={rest['aria-label']}
      className="rounded-[12px] border border-border bg-background/60 px-2.5 py-2 text-[12.5px] text-foreground-strong focus:border-primary/60 focus:outline-none focus:ring-2 focus:ring-primary/30"
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  )
}
