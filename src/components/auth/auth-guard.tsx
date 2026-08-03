'use client'

/**
 * AuthGuard — render-only gate.
 *
 * Does NOT navigate. Navigation decisions live in `useRequireAuth`.
 * This component receives a status from the consumer and renders
 * either a loading state, an unauthorized message, or the children.
 */

import type { ReactNode } from 'react'
import { ShieldAlert } from 'lucide-react'

export type AuthGuardProps = {
  status: 'loading' | 'authorized'
  children: ReactNode
}

export function AuthGuard({ status, children }: AuthGuardProps) {
  if (status === 'loading') {
    return (
      <div
        role="status"
        aria-live="polite"
        aria-busy="true"
        aria-label="Memeriksa sesi"
        className="mx-auto flex max-w-md flex-col items-center gap-3 px-6 py-20"
      >
        <span
          className="size-9 animate-spin rounded-full border-2 border-border border-t-primary"
          aria-hidden="true"
        />
        <p className="text-[12.5px] text-muted-foreground">Memeriksa sesi…</p>
      </div>
    )
  }

  return <>{children}</>
}

/** Companion block used by routes that want a visible unauthorized state. */
export function UnauthorizedState({ message }: { message?: string }) {
  return (
    <div
      role="alert"
      className="mx-auto flex max-w-md flex-col items-center gap-3 px-6 py-20 text-center"
    >
      <span
        aria-hidden="true"
        className="grid size-12 place-items-center rounded-full bg-primary-subtle text-primary-strong"
      >
        <ShieldAlert size={20} />
      </span>
      <h2 className="font-jp text-[15px] font-bold tracking-tight text-foreground-strong">
        Tidak punya akses
      </h2>
      <p className="text-[12px] text-muted-foreground">
        {message || 'Akun Anda tidak punya izin untuk halaman ini. Silakan kembali ke beranda.'}
      </p>
    </div>
  )
}
