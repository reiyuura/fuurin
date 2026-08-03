'use client'

import { createContext, useCallback, useContext, useEffect, useState } from 'react'

const KEY = 'fuurin-favorites'

const FavCtx = createContext<{
  favorites: string[]
  isFavorite: (src: string) => boolean
  toggle: (src: string) => void
  ready: boolean
}>({ favorites: [], isFavorite: () => false, toggle: () => {}, ready: false })

export function FavoritesProvider({ children }: { children: React.ReactNode }) {
  const [favorites, setFavorites] = useState<string[]>([])
  const [ready, setReady] = useState(false)

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(KEY)
      if (raw) setFavorites(JSON.parse(raw) as string[])
    } catch {
      /* ignore corrupt storage */
    }
    setReady(true)
  }, [])

  const toggle = useCallback((src: string) => {
    setFavorites((prev) => {
      const next = prev.includes(src) ? prev.filter((s) => s !== src) : [...prev, src]
      window.localStorage.setItem(KEY, JSON.stringify(next))
      return next
    })
  }, [])

  const isFavorite = useCallback((src: string) => favorites.includes(src), [favorites])

  return (
    <FavCtx.Provider value={{ favorites, isFavorite, toggle, ready }}>{children}</FavCtx.Provider>
  )
}

export function useFavorites() {
  return useContext(FavCtx)
}
