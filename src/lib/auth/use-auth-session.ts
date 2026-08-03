/**
 * useAuthSession — restore session on mount, expose login/logout.
 *
 * Sprint 20C: replaces mock authProvider when apiMode === 'fetch'.
 * On mount, tries POST /auth/refresh → GET /users/me to restore.
 * Falls back to guest if refresh fails or apiMode !== 'fetch'.
 */

'use client'

import { useCallback, useEffect, useState } from 'react'
import type { SessionUser } from '@/lib/repositories/auth-repository'
import { FetchAuthRepository } from '@/lib/repositories/auth-repository'
import { getApiClient } from '@/lib/repositories/api-client-provider'
import { getEnvironment } from '@/lib/config/env'

export type AuthState = {
  status: 'loading' | 'authenticated' | 'guest'
  user: SessionUser | null
  login: (email: string, password: string) => Promise<SessionUser>
  logout: () => Promise<void>
}

export function useAuthSession(): AuthState {
  const env = getEnvironment()
  const isFetch = env.apiMode === 'fetch'
  const [user, setUser] = useState<SessionUser | null>(null)
  const [status, setStatus] = useState<'loading' | 'authenticated' | 'guest'>('loading')

  // Restore session on mount (fetch mode only).
  useEffect(() => {
    if (!isFetch) {
      setStatus('guest')
      return
    }
    const repo = new FetchAuthRepository(getApiClient())
    repo.refresh().then((refreshRes) => {
      if (!refreshRes.ok) {
        setStatus('guest')
        return
      }
      repo.currentUser().then((userRes) => {
        if (userRes.ok) {
          setUser(userRes.data)
          setStatus('authenticated')
        } else {
          setStatus('guest')
        }
      }).catch(() => setStatus('guest'))
    }).catch(() => setStatus('guest'))
  }, [isFetch])

  const login = useCallback(async (email: string, password: string): Promise<SessionUser> => {
    if (!isFetch) throw new Error('Login hanya tersedia di fetch mode.')
    const repo = new FetchAuthRepository(getApiClient())
    const res = await repo.login(email, password)
    if (!res.ok) throw new Error(res.error.message)
    const userRes = await repo.currentUser()
    if (userRes.ok) {
      setUser(userRes.data)
      setStatus('authenticated')
    }
    return res.data.user
  }, [isFetch])

  const logout = useCallback(async () => {
    if (!isFetch) return
    const repo = new FetchAuthRepository(getApiClient())
    await repo.logout()
    setUser(null)
    setStatus('guest')
  }, [isFetch])

  return { status, user, login, logout }
}