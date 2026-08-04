'use client'

/**
 * UserMenu — avatar/name/role + logout dropdown.
 *
 * Sprint 20D: reads from SessionProvider (user + status + logout).
 */

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { LogOut, Settings, User as UserIcon } from 'lucide-react'
import { useAuth } from '@/hooks/use-auth'
import { Dropdown } from '@/components/ui/dropdown'

export function UserMenu() {
  const { user, status, logout } = useAuth()
  const [open, setOpen] = useState(false)
  const [pending, setPending] = useState(false)
  const wrapperRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function onClick(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) setOpen(false)
    }
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') setOpen(false) }
    window.addEventListener('click', onClick)
    window.addEventListener('keydown', onKey)
    return () => { window.removeEventListener('click', onClick); window.removeEventListener('keydown', onKey) }
  }, [open])

  const handleLogout = async () => {
    setPending(true)
    try { await logout() } finally { setPending(false); setOpen(false) }
  }

  if (status === 'loading') {
    return <div className="h-8 w-8 rounded-full animate-pulse bg-hover" />
  }

  if (status === 'guest' || !user) {
    return (
      <Link href="/login" className="inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-[11px] font-medium text-foreground-strong transition hover:bg-hover">
        <UserIcon size={14} aria-hidden="true" />
        <span>Login</span>
      </Link>
    )
  }

  return (
    <div ref={wrapperRef} className="relative">
      <button type="button" aria-label="Buka menu akun" aria-haspopup="menu" aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="ml-0.5 flex h-8 items-center gap-1.5 rounded-full pl-0.5 pr-1.5 transition hover:bg-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40">
        <Image src={user.avatar || '/avatar-placeholder.jpg'} alt={user.displayName || 'Avatar'}
          width={28} height={28} className="size-7 rounded-full border border-primary/25 object-cover" />
        <span className="hidden text-[11px] font-medium text-foreground-strong sm:inline">{user.displayName}</span>
      </button>
      {open && (
        <Dropdown className="w-56" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center gap-2 px-2 py-1.5">
            <Image src={user.avatar || '/avatar-placeholder.jpg'} alt=""
              width={32} height={32} className="size-8 rounded-full border border-border object-cover" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[12px] font-semibold text-foreground-strong">{user.displayName}</p>
              <p className="truncate text-[10.5px] text-muted-foreground">{user.email}</p>
            </div>
          </div>
          <hr className="my-1 border-border/60" />
          <Link href="/about" className="flex items-center gap-2 rounded-xl px-3 py-2 text-xs text-foreground-strong transition hover:bg-hover">
            <Settings size={13} aria-hidden="true" />Settings
          </Link>
          <button type="button" disabled={pending}
            onClick={handleLogout}
            className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs text-error transition hover:bg-hover disabled:opacity-50">
            <LogOut size={13} aria-hidden="true" />{pending ? 'Keluar...' : 'Keluar'}
          </button>
        </Dropdown>
      )}
    </div>
  )
}