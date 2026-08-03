'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { ALBUMS, MEMBERS, RECENT_PHOTOS, TIMELINE, type Album, type Member, type Photo, type TimelineEntry } from '@/lib/data'
import { useLocale, type Locale } from '@/lib/i18n'
import { searchAll, type SearchResults } from '@/lib/search-utils'
import { addHistory, clearHistory, loadHistory, removeHistory } from '@/lib/search-history'

type SearchCtxValue = {
  open: boolean
  setOpen: (v: boolean) => void
  /** Raw input — updated on every keystroke, drives the input field. */
  inputValue: string
  setInputValue: (v: string) => void
  /** Debounced query — drives search execution. */
  debouncedQuery: string
  /** Search history (newest first, max 10). */
  history: string[]
  pushHistory: (q: string) => void
  forgetHistory: (q: string) => void
  wipeHistory: () => void
}

const SearchCtx = createContext<SearchCtxValue>({
  open: false,
  setOpen: () => {},
  inputValue: '',
  setInputValue: () => {},
  debouncedQuery: '',
  history: [],
  pushHistory: () => {},
  forgetHistory: () => {},
  wipeHistory: () => {},
})

const DEBOUNCE_MS = 250

export function SearchProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false)
  const [inputValue, setInputValue] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [history, setHistory] = useState<string[]>([])

  // Load history once (client-only, safe).
  useEffect(() => {
    setHistory(loadHistory())
  }, [])

  /* ── Debounce: inputValue stays responsive, query lags 250ms ── */
  useEffect(() => {
    if (!open) return
    const timer = setTimeout(() => setDebouncedQuery(inputValue), DEBOUNCE_MS)
    return () => clearTimeout(timer)
  }, [inputValue, open])

  // Reset query when the palette closes so it reopens clean.
  useEffect(() => {
    if (!open) {
      setInputValue('')
      setDebouncedQuery('')
    }
  }, [open])

  const pushHistory = useCallback((q: string) => {
    setHistory(addHistory(q))
  }, [])

  const forgetHistory = useCallback((q: string) => {
    setHistory(removeHistory(q))
  }, [])

  const wipeHistory = useCallback(() => {
    setHistory(clearHistory())
  }, [])

  // Cmd/Ctrl+K toggles the palette; Escape closes it.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setOpen((v) => !v)
      } else if (e.key === 'Escape') {
        setOpen(false)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // Lock body scroll while the palette is open.
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [open])

  return (
    <SearchCtx.Provider
      value={{
        open,
        setOpen,
        inputValue,
        setInputValue,
        debouncedQuery,
        history,
        pushHistory,
        forgetHistory,
        wipeHistory,
      }}
    >
      {children}
    </SearchCtx.Provider>
  )
}

export function useSearch() {
  return useContext(SearchCtx)
}

/* ── Dataset-backed search execution ───────────────────────────── */

export function useSearchResults(): SearchResults {
  const { debouncedQuery } = useSearch()
  const { locale } = useLocale()

  return useMemo(
    () =>
      searchAll(
        {
          albums: ALBUMS as Album[],
          photos: RECENT_PHOTOS as Photo[],
          members: MEMBERS as Member[],
          timeline: TIMELINE as TimelineEntry[],
        },
        debouncedQuery,
        locale as Locale,
      ),
    [debouncedQuery, locale],
  )
}
