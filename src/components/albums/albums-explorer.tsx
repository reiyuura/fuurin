'use client'

import { useEffect, useMemo, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useLocale } from '@/lib/i18n'
import { pick, type Album, type AlbumCategory } from '@/lib/data'
import {
  buildCategoryOptions,
  filterAlbums,
  sortAlbums,
  type AlbumSortKey,
} from '@/lib/album-utils'
import { AlbumSearch } from '@/components/ui/album-search'
import { AlbumFilter } from '@/components/ui/album-filter'
import { AlbumSort, type SortOption } from '@/components/ui/album-sort'
import { AlbumGrid } from '@/components/ui/album-grid'
import { AlbumEmptyState } from '@/components/ui/album-empty-state'
import { Tag } from '@/components/ui/tag'
import { X } from 'lucide-react'

const SORT_OPTIONS: SortOption[] = [
  { value: 'newest', label: 'Newest' },
  { value: 'oldest', label: 'Oldest' },
  { value: 'most-photos', label: 'Most Photos' },
  { value: 'alphabetical', label: 'Alphabetical' },
  { value: 'name-desc', label: 'Name Z–A' },
]

const CATEGORY_LABELS: Record<AlbumCategory, string> = {
  school: 'School',
  festival: 'Festival',
  study: 'Study',
  travel: 'Travel',
  graduation: 'Graduation',
}

const MONTHS = [
  { value: '1', label: 'Jan' },
  { value: '2', label: 'Feb' },
  { value: '3', label: 'Mar' },
  { value: '4', label: 'Apr' },
  { value: '5', label: 'May' },
  { value: '6', label: 'Jun' },
  { value: '7', label: 'Jul' },
  { value: '8', label: 'Aug' },
  { value: '9', label: 'Sep' },
  { value: '10', label: 'Oct' },
  { value: '11', label: 'Nov' },
  { value: '12', label: 'Dec' },
]

const YEARS = ['2025', '2026']

export function AlbumsExplorer({
  albums,
  tagsByAlbum,
}: {
  albums: Album[]
  tagsByAlbum: Record<string, string[]>
}) {
  const { locale } = useLocale()
  const router = useRouter()
  const searchParams = useSearchParams()

  /* ── URL state — single source of truth ───────────────────── */
  const query = searchParams.get('q') ?? ''
  const category = (searchParams.get('category') ?? 'all') as AlbumCategory | 'all'
  const sort = (searchParams.get('sort') ?? 'newest') as AlbumSortKey
  const year = searchParams.get('year') ?? ''
  const month = searchParams.get('month') ?? ''
  const tag = searchParams.get('tag') ?? ''

  /* ── Keep previous params so we can skip no-op replaces ───── */
  const prevParams = useRef('')

  /** Build /albums URL with current params + one override.
      Only params with values are included — never ?q=&sort=. */
  function buildUrl(overrides: {
    query?: string
    category?: string
    sort?: string
    year?: string
    month?: string
    tag?: string
  }) {
    const params = new URLSearchParams()
    const q = overrides.query ?? query
    const cat = overrides.category ?? category
    const s = overrides.sort ?? sort
    const y = overrides.year ?? year
    const m = overrides.month ?? month
    const tg = overrides.tag ?? tag
    if (q) params.set('q', q)
    if (cat !== 'all') params.set('category', cat)
    if (s !== 'newest') params.set('sort', s)
    if (y) params.set('year', y)
    if (m) params.set('month', m)
    if (tg) params.set('tag', tg)
    const qs = params.toString()
    return qs ? `/albums?${qs}` : '/albums'
  }

  function navigate(next: string) {
    if (next === prevParams.current) return
    prevParams.current = next
    router.replace(next, { scroll: false })
  }

  /* ── Mirror URL state changes back to the address bar ─────── */
  useEffect(() => {
    navigate(buildUrl({}))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, category, sort, year, month, tag])

  /* ── Derive options (presentation-only, from data) ────────── */
  const categories = useMemo(
    () =>
      buildCategoryOptions(albums).map((opt) => ({
        value: opt.value,
        label:
          opt.value === 'all' ? 'All' : CATEGORY_LABELS[opt.value as AlbumCategory],
        count: opt.count,
      })),
    [albums],
  )

  /* All tags present across albums — for the tag filter chips. */
  const allTags = useMemo(() => {
    const set = new Set<string>()
    for (const tags of Object.values(tagsByAlbum)) for (const t of tags) set.add(t)
    return [...set].sort()
  }, [tagsByAlbum])

  /* ── Filter + sort — business logic in album-utils ────────── */
  const filtered = useMemo(
    () =>
      sortAlbums(
        filterAlbums(albums, { query, category, year, month, tag }, tagsByAlbum),
        sort,
      ),
    [query, category, year, month, tag, sort, tagsByAlbum, albums],
  )

  /* ── Presentation-ready items for the grid ────────────────── */
  const items = useMemo(
    () =>
      filtered.map((album) => ({
        slug: album.slug,
        cover: album.cover,
        title: pick(album.title, locale),
        date: pick(album.period, locale),
        photoCount: album.count,
      })),
    [filtered, locale],
  )

  function resetAll() {
    prevParams.current = ''
    router.replace('/albums', { scroll: false })
  }

  const activeFilters = [year && `Tahun ${year}`, month && MONTHS.find((m) => m.value === month)?.label, tag]
    .filter(Boolean)

  return (
    <div className="space-y-6">
      {/* Toolbar — mobile: search full-width, chips scroll, sort below */}
      <div className="space-y-3">
        <AlbumSearch
          defaultValue={query}
          onValueChange={(v) => navigate(buildUrl({ query: v }))}
          className="md:max-w-sm"
        />
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <AlbumFilter
            categories={categories}
            active={category}
            onChange={(v) => navigate(buildUrl({ category: v }))}
            className="min-w-0 flex-1"
          />
          <AlbumSort
            options={SORT_OPTIONS}
            active={sort}
            onChange={(v) => navigate(buildUrl({ sort: v }))}
            className="md:shrink-0"
          />
        </div>

        {/* Advanced filters: year / month / tag — combinable */}
        <div className="flex flex-wrap items-center gap-2">
          <select
            aria-label="Filter tahun"
            value={year}
            onChange={(e) => navigate(buildUrl({ year: e.target.value }))}
            className="h-10 rounded-full border border-border bg-card px-3 text-xs font-medium text-foreground-strong outline-none transition focus-visible:border-primary/50"
          >
            <option value="">Semua tahun</option>
            {YEARS.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
          <select
            aria-label="Filter bulan"
            value={month}
            onChange={(e) => navigate(buildUrl({ month: e.target.value }))}
            className="h-10 rounded-full border border-border bg-card px-3 text-xs font-medium text-foreground-strong outline-none transition focus-visible:border-primary/50"
          >
            <option value="">Semua bulan</option>
            {MONTHS.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>
          <select
            aria-label="Filter tag"
            value={tag}
            onChange={(e) => navigate(buildUrl({ tag: e.target.value }))}
            className="h-10 rounded-full border border-border bg-card px-3 text-xs font-medium text-foreground-strong outline-none transition focus-visible:border-primary/50"
          >
            <option value="">Semua tag</option>
            {allTags.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
          {activeFilters.length > 0 && (
            <button
              onClick={() => navigate(buildUrl({ year: '', month: '', tag: '' }))}
              className="inline-flex h-10 items-center gap-1.5 rounded-full px-3 text-xs font-semibold text-primary transition hover:bg-primary-subtle/50"
            >
              <X size={12} aria-hidden="true" />
              Bersihkan filter
            </button>
          )}
        </div>
      </div>

      {/* Result counter — live region so SR announces count changes */}
      <p
        aria-live="polite"
        className="text-[11px] font-medium tracking-wide text-muted-foreground"
      >
        {filtered.length} album{filtered.length !== 1 ? 's' : ''}
      </p>

      {/* Active tag chip (kept for consistency with the palette) */}
      {tag && (
        <div className="flex flex-wrap gap-1.5">
          <Tag size="sm" variant="chip" className="[&:hover]:translate-x-0">
            {tag}
          </Tag>
        </div>
      )}

      {/* Content */}
      {filtered.length === 0 ? (
        <AlbumEmptyState
          illustration="search"
          title="Nggak ada album yang cocok"
          description="Coba ubah kata kunci pencarian, filter, atau pilih kategori lain."
          action={{
            label: 'Reset Filter',
            variant: 'secondary',
            onClick: resetAll,
          }}
          className="py-20"
        />
      ) : (
        <AlbumGrid albums={items} />
      )}
    </div>
  )
}
