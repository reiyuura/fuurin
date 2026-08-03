'use client'

/**
 * UserMenu — render-only avatar/name/role + logout dropdown.
 *
 * Reads the session from the auth context. The dropdown opens on
 * click, closes on outside-click and Escape. Logout fires the auth
 * provider's `logout()` and refreshes the page so server-rendered
 * protected routes re-evaluate.
 */

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { LogOut, Settings, User as UserIcon } from 'lucide-react'
import { useAuth } from '@/hooks/use-auth'
import { Dropdown } from '@/components/ui/dropdown'
import { RoleBadge } from '@/components/auth/role-badge'

export function UserMenu() {
  const { session, status, logout } = useAuth()
  const [open, setOpen] = useState(false)
  const [pending, setPending] = useState(false)
  const wrapperRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function onClick(e: MouseEvent) {
      if (!wrapperRef.current) return
      if (!wrapperRef.current.contains(e.target as Node)) setOpen(false)
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('mousedown', onClick)
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('mousedown', onClick)
      window.removeEventListener('keydown', onKey)
    }
  }, [open])

  if (status === 'loading') {
    return (
      <div
        className="ml-0.5 h-8 w-32 animate-pulse rounded-full bg-muted/70"
        aria-hidden="true"
      />
    )
  }

  if (status === 'guest' || !session) {
    return (
      <Link
        href="/login"
        className="ml-0.5 inline-flex h-8 items-center gap-1.5 rounded-full border border-border bg-card px-3 text-[11.5px] font-semibold text-foreground-strong transition hover:border-primary/40 hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
      >
        <UserIcon size={12} aria-hidden="true" />
        Login
      </Link>
    )
  }

  async function handleLogout() {
    setPending(true)
    try {
      await logout()
      // Hard refresh so server pages re-evaluate guards and SSR cache.
      window.location.assign('/')
    } finally {
      setPending(false)
    }
  }

  const user = session.user
  return (
    <div ref={wrapperRef} className="relative">
      <button
        type="button"
        aria-label="Buka menu akun"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="ml-0.5 flex h-8 items-center gap-1.5 rounded-full pl-0.5 pr-1.5 transition hover:bg-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
      >
        <Image
          src={user.avatar}
          alt={user.name}
          width={28}
          height={28}
          className="size-7 rounded-full border border-primary/25 object-cover"
        />
        <span className="hidden text-[11px] font-medium text-foreground-strong sm:inline">
          {user.name}
        </span>
      </button>
      {open && (
        <Dropdown className="w-56" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center gap-2 px-2 py-1.5">
            <Image
              src={user.avatar}
              alt=""
              width={32}
              height={32}
              className="size-8 rounded-full border border-border object-cover"
            />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[12px] font-semibold text-foreground-strong">
                {user.name}
              </p>
              <p className="truncate text-[10.5px] text-muted-foreground">{user.email}</p>
            </div>
          </div>
          <div className="px-2 pb-1">
            <RoleBadge role={user.role} />
          </div>
          <hr className="my-1 border-border/60" />
          <Link
            href="/about"
            className="flex items-center gap-2 rounded-xl px-3 py-2 text-xs text-foreground-strong transition hover:bg-hover"
          >
            <UserIcon size={13} aria-hidden="true" />
            Profil
          </Link>
          <Link
            href="/about"
            className="flex items-center gap-2 rounded-xl px-3 py-2 text-xs text-foreground-strong transition hover:bg-hover"
          >
            <Settings size={13} aria-hidden="true" />
            Pengaturan
          </Link>
          <hr className="my-1 border-border/60" />
          <button
            type="button"
            onClick={handleLogout}
            disabled={pending}
            className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-xs text-foreground-strong transition hover:bg-hover disabled:opacity-60"
          >
            <LogOut size={13} aria-hidden="true" />
            {pending ? 'Keluar…' : 'Logout'}
          </button>
        </Dropdown>
      )}
    </div>
  )
}
