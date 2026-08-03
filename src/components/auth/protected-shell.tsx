'use client'

/**
 * ProtectedShell — client-side redirect gate.
 *
 * Calls `useRequireAuth` and renders `<AuthGuard>` once navigation
 * decisions resolve. Pages compose this shell instead of duplicating
 * the loading + guard pattern.
 */

import { useRequireAuth, type UseRequireAuthOpts } from '@/hooks/use-require-auth'
import { AuthGuard } from '@/components/auth/auth-guard'

export type ProtectedShellProps = UseRequireAuthOpts & {
  children: React.ReactNode
}

export function ProtectedShell(props: ProtectedShellProps) {
  const status = useRequireAuth(props)
  return (
    <AuthGuard status={status}>{props.children}</AuthGuard>
  )
}
