'use client'

/**
 * EditorSidebar — responsive sidebar navigation.
 *
 * Active route highlighted. Admin-only items hidden for editors.
 * Collapses to hamburger on mobile.
 */

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { Album, FileText, Image, LayoutDashboard, Menu, X } from 'lucide-react'
import { useSession } from '@/components/auth/session-provider'
import clsx from 'clsx'

const links = [
  { href: '/editor', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/editor/albums', icon: Album, label: 'Albums' },
  { href: '/editor/drafts', icon: FileText, label: 'Drafts' },
  { href: '/editor/media', icon: Image, label: 'Media' },
]

export function EditorSidebar() {
  const pathname = usePathname()
  const { user } = useSession()
  const [open, setOpen] = useState(false)

  return (
    <>
      {/* Mobile toggle */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="fixed top-3 left-3 z-50 rounded-xl bg-card p-2 shadow-md lg:hidden"
        aria-label="Toggle sidebar"
      >
        {open ? <X size={18} /> : <Menu size={18} />}
      </button>

      {/* Sidebar */}
      <aside
        className={clsx(
          'fixed inset-y-0 left-0 z-40 w-[85%] max-w-72 bg-card border-r border-border flex flex-col transition-transform duration-300 ease-in-out lg:translate-x-0 lg:w-64',
          open ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        {/* Brand */}
        <div className="flex h-16 items-center px-5 font-semibold text-base text-foreground-strong border-b border-border">
          Fuurin Editor
          {user && (
            <span className="ml-auto rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
              {user.role}
            </span>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto p-3 space-y-1">
          {links.map((l) => {
            const active = pathname === l.href || (l.href !== '/editor' && pathname.startsWith(l.href))
            return (
              <Link
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className={clsx(
                  'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition',
                  active
                    ? 'bg-primary/10 text-primary'
                    : 'text-foreground-strong hover:bg-hover',
                )}
              >
                <l.icon size={16} aria-hidden="true" />
                {l.label}
              </Link>
            )
          })}
        </nav>

        {/* Footer user */}
        <div className="border-t border-border px-5 py-3 text-[11px] text-muted-foreground">
          <Link href="/" className="hover:text-primary transition">
            ← Kembali ke situs
          </Link>
        </div>
      </aside>

      {/* Overlay on mobile */}
      {open && (
        <div
          onClick={() => setOpen(false)}
          className="fixed inset-0 z-30 bg-black/20 lg:hidden"
        />
      )}
    </>
  )
}