'use client'

const STORAGE_KEY = 'fuurin.search.history'
const MAX_ITEMS = 10

/* ── localStorage-backed search history ──────────────────────────
   Client-only module. All functions are safe when localStorage is
   unavailable (private mode, disabled storage). */

export function loadHistory(): string[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed)
      ? parsed.filter((v): v is string => typeof v === 'string').slice(0, MAX_ITEMS)
      : []
  } catch {
    return []
  }
}

function persist(items: string[]): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
  } catch {
    /* storage unavailable — history is best-effort */
  }
}

/**
 * Push a query to the front of the history.
 * - trims whitespace, ignores empty
 * - dedupes case-insensitively
 * - caps at MAX_ITEMS (newest first)
 */
export function addHistory(query: string): string[] {
  const q = query.trim()
  if (!q) return loadHistory()

  const rest = loadHistory().filter((item) => item.toLowerCase() !== q.toLowerCase())
  const next = [q, ...rest].slice(0, MAX_ITEMS)
  persist(next)
  return next
}

export function removeHistory(query: string): string[] {
  const next = loadHistory().filter((item) => item !== query)
  persist(next)
  return next
}

export function clearHistory(): string[] {
  persist([])
  return []
}
