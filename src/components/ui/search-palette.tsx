'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Clock, Hash, History, Images, Search, Users, X } from 'lucide-react'
import { useLocale } from '@/lib/i18n'
import { useSearch, useSearchResults } from '@/lib/search'
import { highlightParts, type SearchResult, type SearchResultType } from '@/lib/search-utils'
import { cn } from '@/lib/utils'
import { Tag } from '@/components/ui/tag'

const TYPE_ICON: Record<SearchResultType, typeof Images> = {
  album: Images,
  photo: Search,
  member: Users,
  timeline: Clock,
}

const TYPE_LABEL_KEY: Record<SearchResultType, string> = {
  album: 'search.hintAlbums',
  photo: 'search.hintPhotos',
  member: 'search.hintMembers',
  timeline: 'search.hintTimeline',
}

export function SearchPalette() {
  const {
    open,
    setOpen,
    inputValue,
    setInputValue,
    debouncedQuery,
    history,
    pushHistory,
    forgetHistory,
    wipeHistory,
  } = useSearch()
  const { t } = useLocale()
  const router = useRouter()
  const results = useSearchResults()
  const { searching } = useSearch()

  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLElement | null>(null)
  const [activeIndex, setActiveIndex] = useState(-1)

  /* ── Flattened options for keyboard navigation (UI layer) ──── */
  const options = useMemo<SearchResult[]>(
    () => [
      ...results.albums,
      ...results.photos,
      ...results.members,
      ...results.timeline,
    ],
    [results],
  )

  useEffect(() => {
    if (open) {
      triggerRef.current = document.activeElement as HTMLElement
      inputRef.current?.focus()
      setActiveIndex(-1)
    } else if (triggerRef.current) {
      triggerRef.current.focus()
      triggerRef.current = null
    }
  }, [open])

  // Reset active index when results change (query debounced).
  useEffect(() => {
    setActiveIndex(-1)
  }, [debouncedQuery])

  /* ── Keyboard navigation ───────────────────────────────────── */
  const go = (result: SearchResult) => {
    pushHistory(debouncedQuery || inputValue)
    setOpen(false)
    router.push(result.href)
  }

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.isComposing) return // IME composition — let the editor handle it
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        if (options.length === 0) return
        setActiveIndex((i) => (i + 1) % options.length)
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        if (options.length === 0) return
        setActiveIndex((i) => (i <= 0 ? options.length - 1 : i - 1))
      } else if (e.key === 'Home') {
        e.preventDefault()
        setActiveIndex(0)
      } else if (e.key === 'End') {
        e.preventDefault()
        setActiveIndex(options.length - 1)
      } else if (e.key === 'Enter') {
        e.preventDefault()
        const target = options[activeIndex >= 0 ? activeIndex : 0]
        if (target) go(target)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, options, activeIndex])

  // Keep the active option in view while navigating.
  useEffect(() => {
    if (activeIndex < 0 || !listRef.current) return
    const el = listRef.current.querySelector<HTMLElement>(`[data-index="${activeIndex}"]`)
    el?.scrollIntoView({ block: 'nearest' })
  }, [activeIndex])

  if (!open) return null

  const isEmpty = debouncedQuery.trim().length > 0 && options.length === 0 && !searching
  const showHistory = debouncedQuery.trim().length === 0 && history.length > 0
  const showTags = debouncedQuery.trim().length === 0 && history.length === 0

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center sm:items-start sm:pt-28">
      <button
        onClick={() => setOpen(false)}
        aria-label={t('search.close')}
        className="absolute inset-0 cursor-default bg-scrim/25 backdrop-blur-sm"
      />

      <motion.div
        role="dialog"
        aria-modal="true"
        aria-label={t('search.placeholder')}
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
        className="card-paper relative flex h-[92dvh] w-full flex-col overflow-hidden rounded-t-[1.75rem] border border-border/60 shadow-[0_28px_80px_rgba(160,104,96,0.22)] sm:h-auto sm:max-h-[70vh] sm:w-full sm:max-w-xl sm:rounded-[1.75rem]"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        {/* ── Search input ───────────────────────────────────── */}
        <div className="flex shrink-0 items-center gap-3 border-b border-border/50 px-4 py-3.5">
          <Search size={16} className="shrink-0 text-primary" aria-hidden="true" />
          <input
            ref={inputRef}
            role="combobox"
            aria-expanded="true"
            aria-controls="search-listbox"
            aria-activedescendant={activeIndex >= 0 ? `search-option-${activeIndex}` : undefined}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder={t('search.placeholder')}
            className="min-w-0 flex-1 bg-transparent font-jp text-sm text-foreground-strong outline-none placeholder:text-subtle-foreground dark:placeholder:text-muted-foreground"
          />
          <button
            onClick={() => setOpen(false)}
            aria-label={t('search.close')}
            className="grid size-9 shrink-0 place-items-center rounded-full text-subtle-foreground transition hover:bg-hover hover:text-primary"
          >
            <X size={14} aria-hidden="true" />
          </button>
        </div>

        {/* ── Body: scrollable on mobile ─────────────────────── */}
        <div className="min-h-0 flex-1 overflow-y-auto px-2 py-2 sm:max-h-[58vh]">
          {/* Recent searches — when query is empty */}
          {showHistory && (
            <div className="py-1.5">
              <div className="flex items-center justify-between px-3 pb-1">
                <p className="text-[10px] font-bold uppercase tracking-[.16em] text-subtle-foreground">
                  {t('search.history')}
                </p>
                <button
                  onClick={wipeHistory}
                  className="text-[10.5px] font-semibold text-subtle-foreground transition hover:text-primary"
                >
                  {t('search.clearAll')}
                </button>
              </div>
              <ul className="space-y-0.5">
                {history.map((item) => (
                  <li key={item}>
                    <div className="group flex items-center rounded-2xl px-3 transition hover:bg-hover">
                      <button
                        onClick={() => setInputValue(item)}
                        className="flex min-h-11 flex-1 items-center gap-3 py-2 text-left"
                      >
                        <History size={13} className="shrink-0 text-subtle-foreground" aria-hidden="true" />
                        <span className="truncate font-jp text-xs text-foreground-strong">{item}</span>
                      </button>
                      <button
                        onClick={() => forgetHistory(item)}
                        aria-label={`${t('search.removeHistory')}: ${item}`}
                        className="grid size-9 shrink-0 place-items-center rounded-full text-subtle-foreground opacity-0 transition hover:bg-hover hover:text-primary focus-visible:opacity-100 group-hover:opacity-100"
                      >
                        <X size={12} aria-hidden="true" />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Popular tags — when no query and no history yet */}
          {showTags && (
            <div className="py-1.5">
              <p className="px-3 pb-1 text-[10px] font-bold uppercase tracking-[.16em] text-subtle-foreground">
                {t('tags.heading')}
              </p>
              <div className="flex flex-wrap gap-1.5 px-3 py-1">
                {['Hanami', 'Festival', 'Belajar', 'Travel', 'Makan', 'Jepang'].map((tag) => (
                  <Tag key={tag} onClick={() => setInputValue(tag)} size="sm" variant="chip">
                    <Hash size={10} aria-hidden="true" />
                    {tag}
                  </Tag>
                ))}
              </div>
            </div>
          )}

          {/* Loading state — API-backed search in flight */}
          {searching && options.length === 0 && debouncedQuery.trim().length > 0 && (
            <div className="flex flex-col items-center gap-3 px-6 py-12 text-center" aria-busy="true">
              <div className="grid size-14 place-items-center rounded-full bg-primary-subtle/60 text-primary">
                <Search size={22} aria-hidden="true" strokeWidth={1.5} className="animate-pulse" />
              </div>
              <p className="font-jp text-sm font-semibold text-foreground-strong">
                Mencari…
              </p>
            </div>
          )}

          {/* Empty state */}
          {isEmpty && (
            <div className="flex flex-col items-center gap-3 px-6 py-12 text-center">
              <div className="grid size-14 place-items-center rounded-full bg-primary-subtle/60 text-primary">
                <Search size={22} aria-hidden="true" strokeWidth={1.5} />
              </div>
              <p className="font-jp text-sm font-semibold text-foreground-strong">
                {t('search.emptyTitle')}
              </p>
              <p className="max-w-xs text-xs leading-relaxed text-muted-foreground">
                {t('search.emptyDesc')}
              </p>
              <button
                onClick={() => setInputValue('')}
                className="mt-1 min-h-11 rounded-full border border-border bg-card px-5 text-xs font-semibold text-foreground-strong transition hover:border-primary/40 hover:text-primary"
              >
                {t('search.reset')}
              </button>
            </div>
          )}

          {/* Results */}
          {!isEmpty && options.length > 0 && (
            <div id="search-listbox" ref={listRef} role="listbox" aria-label={t('search.placeholder')} className="py-1">
              {(
                [
                  ['album', results.albums],
                  ['photo', results.photos],
                  ['member', results.members],
                  ['timeline', results.timeline],
                ] as [SearchResultType, SearchResult[]][]
              ).map(([type, group]) => {
                if (group.length === 0) return null
                const Icon = TYPE_ICON[type]
                return (
                  <div key={type} className="py-1">
                    <p className="px-3 pb-1 text-[10px] font-bold uppercase tracking-[.16em] text-subtle-foreground">
                      {t(TYPE_LABEL_KEY[type] as 'search.hintAlbums')}
                    </p>
                    {group.map((result: SearchResult) => {
                      const flatIndex = options.indexOf(result)
                      const selected = flatIndex === activeIndex
                      return (
                        <a
                          key={`${type}-${result.id}`}
                          id={`search-option-${flatIndex}`}
                          data-index={flatIndex}
                          role="option"
                          aria-selected={selected}
                          onMouseEnter={() => setActiveIndex(flatIndex)}
                          onClick={() => go(result)}
                          className={cn(
                            'flex cursor-pointer items-center gap-3 rounded-2xl px-3 py-2 transition',
                            selected ? 'bg-hover' : 'hover:bg-hover',
                          )}
                        >
                          {result.image ? (
                            <Image
                              src={result.image}
                              alt=""
                              width={36}
                              height={36}
                              className="size-9 shrink-0 rounded-xl object-cover"
                            />
                          ) : (
                            <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary-subtle/60 text-primary">
                              <Icon size={15} aria-hidden="true" />
                            </span>
                          )}
                          <span className="min-w-0 flex-1">
                            <span className="block truncate font-jp text-xs font-medium text-foreground-strong">
                              <Highlight text={result.title} query={debouncedQuery} />
                            </span>
                            {result.subtitle && (
                              <span className="block truncate text-[11px] text-muted-foreground">
                                <Highlight text={result.subtitle} query={debouncedQuery} />
                              </span>
                            )}
                          </span>
                          <Icon size={13} className="shrink-0 text-subtle-foreground" aria-hidden="true" />
                        </a>
                      )
                    })}
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Footer hint */}
        <div className="hidden shrink-0 items-center gap-3 border-t border-border/40 px-4 py-2 text-[10px] text-subtle-foreground sm:flex">
          <span>↑↓ navigasi</span>
          <span>Enter pilih</span>
          <span>Esc tutup</span>
        </div>
      </motion.div>
    </div>
  )
}

/** Highlight-matched text with semantic <mark> — no dangerouslySetInnerHTML. */
function Highlight({ text, query }: { text: string; query: string }) {
  const parts = useMemo(() => highlightParts(text, query), [text, query])
  return (
    <>
      {parts.map((part, i) =>
        part.match ? (
          <mark
            key={i}
            className="rounded-[3px] bg-primary/15 px-px text-primary-ink dark:bg-primary/25"
          >
            {part.text}
          </mark>
        ) : (
          <span key={i}>{part.text}</span>
        ),
      )}
    </>
  )
}
