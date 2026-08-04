'use client'

/**
 * use-require-auth — navigation-side guard.
 *
 * Single source of truth for redirect decisions. Pages that need
 * auth call this hook at the top; the hook handles three states:
 *
 *   loading        → returns 'loading' (no redirect)
 *   unauthenticated→ router.replace('/login?next=<path>')
 *   unauthorized   → router.replace('/')
 *   authorized     → returns 'authorized'
 *
 * `AuthGuard` (UI) only renders loading / unauthorized UI / children —
 * it never navigates.
 */

import { useCallback, useEffect } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/hooks/use-auth'
import type { Permission, Role } from '@/types/auth'

export type RequireAuthResult = 'loading' | 'authorized'

export type UseRequireAuthOpts = {
  /** Optional role gate — user must have one of these roles. */
  roles?: readonly Role[]
  /** Optional permission gate — user must have this permission. */
  permission?: Permission
  /** Path to redirect guests to. Default `/login`. */
  loginPath?: string
  /** Path to redirect unauthorized users to. Default `/`. */
  unauthorizedPath?: string
}

export function useRequireAuth(opts: UseRequireAuthOpts = {}): RequireAuthResult {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const { status, user } = useAuth()

  // Inline role check — wrapped in useCallback to stabilize useEffect deps.
  const hasAnyRole = useCallback(
    (roles: readonly string[]) => !!user && roles.includes(user.role),
    [user],
  )
  const hasPermission = useCallback((_perm: string) => !!user, [user])

  useEffect(() => {
    if (status === 'loading') return
    if (status === 'guest') {
      const next = `${pathname}${searchParams?.toString() ? `?${searchParams.toString()}` : ''}`
      const target = `${opts.loginPath ?? '/login'}?next=${encodeURIComponent(next)}`
      router.replace(target)
      return
    }
    // Authenticated — check gates.
    if (opts.roles && !hasAnyRole(opts.roles)) {
      router.replace(opts.unauthorizedPath ?? '/forbidden')
      return
    }
    if (opts.permission && !hasPermission(opts.permission)) {
      router.replace(opts.unauthorizedPath ?? '/forbidden')
      return
    }
  }, [status, pathname, searchParams, router, opts, hasAnyRole, hasPermission])

  if (status === 'loading') return 'loading'
  if (status === 'guest') return 'loading' // waiting for redirect
  if (opts.roles && !hasAnyRole(opts.roles)) return 'loading'
  if (opts.permission && !hasPermission(opts.permission)) return 'loading'
  return 'authorized'
}
