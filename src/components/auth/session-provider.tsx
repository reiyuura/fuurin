'use client'

/**
 * SessionProvider — React Context for auth session.
 *
 * Mock mode (default): hydrates from localStorage via authProvider.
 * Fetch mode (NEXT_PUBLIC_API_MODE=fetch): restores session via
 * POST /auth/refresh → GET /users/me on mount.
 */

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { getEnvironment } from '@/lib/config/env'
import { authProvider } from '@/lib/auth/auth-provider'
import { FetchAuthRepository } from '@/lib/repositories/auth-repository'
import { getApiClient } from '@/lib/repositories/api-client-provider'
import type { SessionUser } from '@/lib/repositories/auth-repository'
import type { User } from '@/types/auth'

/** Map the full User (mock provider) to the lean SessionUser shape. */
function toSessionUser(u: User): SessionUser {
  return {
    id: u.id,
    email: u.email,
    displayName: u.name,
    role: u.role,
    avatar: u.avatar,
  }
}

export type SessionContextValue = {
  status: 'loading' | 'authenticated' | 'guest'
  user: SessionUser | null
  login: (email: string, password: string) => Promise<SessionUser>
  logout: () => Promise<void>
}

const SessionContext = createContext<SessionContextValue | null>(null)

export function useSession(): SessionContextValue {
  const ctx = useContext(SessionContext)
  if (!ctx) throw new Error('useSession must be used within <SessionProvider>')
  return ctx
}

export type SessionProviderProps = { children: React.ReactNode }

export function SessionProvider({ children }: SessionProviderProps) {
  const env = getEnvironment()
  const isFetch = env.apiMode === 'fetch'

  const [user, setUser] = useState<SessionUser | null>(null)
  const [status, setStatus] = useState<SessionContextValue['status']>('loading')

  // Restore session on mount.
  useEffect(() => {
    if (!isFetch) {
      // Mock mode (dev default): hydrate from localStorage via the mock
      // provider so the demo accounts shown on the login form work.
      authProvider.getSession()
        .then((s) => {
          if (s) { setUser(toSessionUser(s.user)); setStatus('authenticated') }
          else setStatus('guest')
        })
        .catch(() => setStatus('guest'))
      return
    }
    // Session-hint cookie (non-HttpOnly, set by the backend at
    // login/refresh): without it there is nothing to restore, so skip
    // the refresh call entirely. This keeps guests from firing
    // POST /auth/refresh on every page load and burning the shared
    // auth rate-limit bucket.
    const hasHint =
      typeof document !== 'undefined' &&
      document.cookie.split(';').some((c) => c.trim().startsWith('fuurin_has_session='))
    if (!hasHint) {
      setStatus('guest')
      return
    }
    const repo = new FetchAuthRepository(getApiClient())
    repo.refresh().then((refreshRes) => {
      if (!refreshRes.ok) { setStatus('guest'); return }
      repo.currentUser().then((userRes) => {
        if (userRes.ok) { setUser(userRes.data); setStatus('authenticated') }
        else { setStatus('guest') }
      }).catch(() => setStatus('guest'))
    }).catch(() => setStatus('guest'))
  }, [isFetch])

  const login = useCallback(async (email: string, password: string) => {
    if (!isFetch) {
      const session = await authProvider.login({ email, password })
      const su = toSessionUser(session.user)
      setUser(su)
      setStatus('authenticated')
      return su
    }
    const repo = new FetchAuthRepository(getApiClient())
    const res = await repo.login(email, password)
    if (!res.ok) throw new Error(res.error.message)
    const userRes = await repo.currentUser()
    if (userRes.ok) { setUser(userRes.data); setStatus('authenticated') }
    return res.data.user
  }, [isFetch])

  const logout = useCallback(async () => {
    if (!isFetch) {
      await authProvider.logout()
      setUser(null)
      setStatus('guest')
      return
    }
    const repo = new FetchAuthRepository(getApiClient())
    await repo.logout()
    setUser(null)
    setStatus('guest')
  }, [isFetch])

  const value = useMemo<SessionContextValue>(() => ({ status, user, login, logout }), [status, user, login, logout])

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
}