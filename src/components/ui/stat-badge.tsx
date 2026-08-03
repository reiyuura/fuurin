'use client'

import type { LucideIcon } from 'lucide-react'

type StatBadgeProps = {
  icon: LucideIcon
  value: number | string
}

/**
 * Translucent stat chip used on photo overlays.
 * White glass with backdrop blur — readable on any image.
 */
export function StatBadge({ icon: Icon, value }: StatBadgeProps) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-card/90 px-1.5 py-0.5 text-[9.5px] font-semibold text-foreground backdrop-blur-sm">
      <Icon size={9} aria-hidden="true" />
      {value}
    </span>
  )
}
