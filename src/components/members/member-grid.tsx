/**
 * MemberGrid — displays class members in a responsive grid.
 */

import Image from 'next/image'
import type { Member, L10n } from '@/lib/data'
import { pick } from '@/lib/data'
import type { Locale } from '@/lib/i18n'

type Props = {
  members: Member[]
  locale: Locale
}

export function MemberGrid({ members, locale }: Props) {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
      {members.map((m) => (
        <div
          key={m.id}
          className="flex flex-col items-center gap-2 rounded-2xl border border-border bg-card p-4 text-center transition hover:border-primary/30"
        >
          <div className="relative h-16 w-16 overflow-hidden rounded-full">
            <Image
              src={m.avatar}
              alt={pick(m.name, locale)}
              fill
              sizes="64px"
              className="object-cover"
            />
          </div>
          <div className="min-w-0">
            <p className="truncate text-[13px] font-semibold text-foreground-strong">
              {pick(m.name, locale)}
            </p>
            <p className="truncate text-[11px] text-muted-foreground">
              {pick(m.role, locale)}
            </p>
          </div>
        </div>
      ))}
    </div>
  )
}

export function MemberCardSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="flex animate-pulse flex-col items-center gap-2 rounded-2xl border border-border bg-card p-4"
        >
          <div className="h-16 w-16 rounded-full bg-muted" />
          <div className="h-3 w-16 rounded bg-muted" />
          <div className="h-2 w-12 rounded bg-muted" />
        </div>
      ))}
    </div>
  )
}

// Re-export types for convenience.
export type { Member, L10n }
