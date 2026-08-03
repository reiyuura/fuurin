'use client'

/**
 * SessionProvider — React Context for the auth session.
 *
 * Source of truth for the active `Session | null` and a stable set of
 * action methods. Hydrates from localStorage on mount, subscribes to
 * provider changes, and listens for cross-tab `storage` events.
 */

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { authProvider } from '@/lib/auth/auth-provider'
import { readSession, SESSION_STORAGE_KEY } from '@/lib/auth/session-storage'
import {
  hasPermission,
  hasRole,
  hasAnyRole,
} from '@/lib/auth/permissions'
import type { Permission, Role, Session } from '@/types/auth'

export type SessionContextValue = {
  status: 'loading' | 'authenticated' | 'guest'
  session: Session | null
  /** Promise-based login; throws on invalid credentials. */
  login: (email: string, password: string) => Promise<Session>
  logout: () => Promise<void>
  hasRole: (role: Role) => boolean
  hasAnyRole: (roles: readonly Role[]) => boolean
  hasPermission: (permission: Permission) => boolean
}

const SessionContext = createContext<SessionContextValue | null>(null)

export function useSession(): SessionContextValue {
  const ctx = useContext(SessionContext)
  if (!ctx) throw new Error('useSession must be used within <SessionProvider>')
  return ctx
}

export type SessionProviderProps = {
  children: React.ReactNode
}

export function SessionProvider({ children }: SessionProviderProps) {
  // Start with `loading` to avoid a hydration flash that swaps the
  // avatar for a "Login" button before the localStorage read resolves.
  const [session, setSession] = useState<Session | null>(null)
  const [hydrated, setHydrated] = useState(false)

  // Initial hydration + provider subscription.
  useEffect(() => {
    setSession(readSession())
    setHydrated(true)

    const unsubscribe = authProvider.subscribe((next) => {
      setSession(next)
    })

    // Cross-tab sync: when another tab writes the session storage
    // key, rehydrate so this tab matches without a refresh.
    function onStorage(e: StorageEvent) {
      if (e.key !== SESSION_STORAGE_KEY) return
      setSession(readSession())
    }
    window.addEventListener('storage', onStorage)

    return () => {
      unsubscribe()
      window.removeEventListener('storage', onStorage)
    }
  }, [])

  const login = useCallback(async (email: string, password: string) => {
    return authProvider.login({ email, password })
  }, [])

  const logout = useCallback(async () => {
    await authProvider.logout()
  }, [])

  const value = useMemo<SessionContextValue>(() => {
    const status: SessionContextValue['status'] = !hydrated
      ? 'loading'
      : session
        ? 'authenticated'
        : 'guest'
    return {
      status,
      session,
      login,
      logout,
      hasRole: (role) => hasRole(session?.user, role),
      hasAnyRole: (roles) => hasAnyRole(session?.user, roles),
      hasPermission: (permission) => hasPermission(session?.user, permission),
    }
  }, [hydrated, session, login, logout])

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
}
