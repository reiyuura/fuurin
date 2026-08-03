'use client'

import { createContext, useCallback, useContext, useEffect, useState } from 'react'

type Theme = 'light' | 'dark'

const ThemeCtx = createContext<{ theme: Theme; toggle: () => void }>({
  theme: 'light',
  toggle: () => {},
})

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>('light')

  useEffect(() => {
    const saved = window.localStorage.getItem('fuurin-theme') as Theme | null
    const initial =
      saved ?? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
    setTheme(initial)
    document.documentElement.classList.toggle('dark', initial === 'dark')
  }, [])

  const toggle = useCallback(() => {
    setTheme((prev) => {
      const next = prev === 'dark' ? 'light' : 'dark'
      window.localStorage.setItem('fuurin-theme', next)
      document.documentElement.classList.toggle('dark', next === 'dark')
      return next
    })
  }, [])

  return <ThemeCtx.Provider value={{ theme, toggle }}>{children}</ThemeCtx.Provider>
}

export function useTheme() {
  return useContext(ThemeCtx)
}

/** Inline script: applies theme before first paint so there is no flash. */
export const themeScript = `(function(){try{var t=localStorage.getItem('fuurin-theme');if(!t){t=window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'}if(t==='dark'){document.documentElement.classList.add('dark')}var l=localStorage.getItem('fuurin-locale');if(l){document.documentElement.lang=l}}catch(e){}})();`
