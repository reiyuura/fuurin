'use client'

import Link from 'next/link'
import { ChevronRight } from 'lucide-react'

type Crumb = { label: string; href?: string }

export function Breadcrumb({ items }: { items: Crumb[] }) {
  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-[12px] text-muted-foreground mb-4">
      {items.map((c, i) => (
        <span key={i} className="flex items-center gap-1.5">
          {i > 0 && <ChevronRight size={11} aria-hidden="true" />}
          {c.href ? (
            <Link href={c.href} className="hover:text-primary transition font-medium">{c.label}</Link>
          ) : (
            <span className="text-foreground-strong font-medium">{c.label}</span>
          )}
        </span>
      ))}
    </nav>
  )
}