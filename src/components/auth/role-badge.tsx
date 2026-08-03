'use client'

/**
 * RoleBadge — render-only role chip.
 *
 * Single source of truth for role presentation. Caller only passes
 * `role`; the badge decides color/label internally so every role
 * representation across the app stays consistent.
 */

import { ShieldCheck, ShieldUser, UserRound } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { Role } from '@/types/auth'

const ROLE_PRESENTATION: Record<
  Role,
  { label: string; Icon: LucideIcon; className: string }
> = {
  admin: {
    label: 'Admin',
    Icon: ShieldCheck,
    className: 'border-primary/40 bg-primary/12 text-primary dark:bg-primary/18',
  },
  editor: {
    label: 'Editor',
    Icon: ShieldUser,
    className: 'border-secondary/40 bg-secondary-subtle text-secondary-ink dark:text-secondary-ink',
  },
  viewer: {
    label: 'Viewer',
    Icon: UserRound,
    className: 'border-border bg-muted/60 text-muted-foreground',
  },
}

export type RoleBadgeProps = {
  role: Role
  className?: string
  size?: 'xs' | 'sm'
}

export function RoleBadge({ role, className, size = 'xs' }: RoleBadgeProps) {
  const presentation = ROLE_PRESENTATION[role]
  const Icon = presentation.Icon
  const sizeClass = size === 'sm' ? 'text-[11.5px] px-2.5 py-1' : 'text-[10px] px-1.5 py-0.5'
  const iconSize = size === 'sm' ? 11 : 9
  return (
    <span
      data-role={role}
      className={
        'inline-flex items-center gap-1 rounded-full border font-semibold uppercase tracking-[.12em] ' +
        sizeClass +
        ' ' +
        presentation.className +
        (className ? ' ' + className : '')
      }
      aria-label={`Peran ${presentation.label}`}
    >
      <Icon size={iconSize} aria-hidden="true" />
      {presentation.label}
    </span>
  )
}
