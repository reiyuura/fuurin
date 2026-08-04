'use client'

/**
 * useAuthReady — gate hook for pages that fetch authenticated data on mount.
 *
 * Returns `true` only when SessionProvider has finished restoring the session
 * (either 'authenticated' or 'guest'). Returns `false` while status is 'loading'.
 *
 * Usage:
 *   const ready = useAuthReady()
 *   useEffect(() => {
 *     if (!ready) return
 *     // safe to fetch — token is set if user is authenticated
 *   }, [ready])
 */

import { useSession } from '@/components/auth/session-provider'

export function useAuthReady(): boolean {
  const { status } = useSession()
  return status !== 'loading'
}
