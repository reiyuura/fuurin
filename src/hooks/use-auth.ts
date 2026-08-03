'use client'

/**
 * useAuth — thin facade over the Session Context.
 *
 * Re-exports `useSession` so feature code that talks about "auth" can
 * `import { useAuth } from '@/hooks/use-auth'`. Identical API surface;
 * this indirection keeps imports scoped to the auth module.
 */

import { useSession } from '@/components/auth/session-provider'

export function useAuth() {
  return useSession()
}
