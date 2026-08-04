'use client'

import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { useLocale } from '@/lib/i18n'
import { searchAll, type SearchResults } from '@/lib/search-utils'
import { addHistory, clearHistory, loadHistory, removeHistory } from '@/lib/search-history'
import { repositories } from '@/lib/repositories/repository-registry'

type SearchCtxValue = {
  open: boolean
  setOpen: (v: boolean) => void
  /** Raw input — updated on every keystroke, drives the input field. */
  inputValue: string
  setInputValue: (v: string) => void
  /** Debounced query — drives search execution. */
  debouncedQuery: string
  /** True while an API-backed search is in flight. */
  searching: boolean
  setSearching: (v: boolean) => void
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
  searching: false,
  setSearching: () => {},
  history: [],
  pushHistory: () => {},
  forgetHistory: () => {},
  wipeHistory: () => {},
})

const DEBOUNCE_MS = 250

const EMPTY_RESULTS: SearchResults = {
  albums: [],
  photos: [],
  members: [],
  timeline: [],
  total: 0,
}

export function SearchProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false)
  const [inputValue, setInputValue] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [history, setHistory] = useState<string[]>([])
  const [searching, setSearching] = useState(false)

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
      setSearching(false)
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
        searching,
        setSearching,
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

/* ── Search execution — repository-backed ─────────────────────── */

export function useSearchResults(): SearchResults {
  const { debouncedQuery, setSearching } = useSearch()
  const { locale } = useLocale()
  const [results, setResults] = useState<SearchResults>(EMPTY_RESULTS)

  useEffect(() => {
    const q = debouncedQuery.trim()
    if (!q) {
      setResults(EMPTY_RESULTS)
      setSearching(false)
      return
    }
    setSearching(true)
    let cancelled = false
    repositories.search.searchAll(q, locale).then((res) => {
      if (cancelled) return
      setResults(res.ok ? res.value : EMPTY_RESULTS)
      setSearching(false)
    })
    return () => {
      cancelled = true
    }
  }, [debouncedQuery, locale, setSearching])

  return results
}

// Keep the pure helper import available for consumers that only need it.
export { searchAll }