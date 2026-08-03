'use client'

import { cn } from '@/lib/utils'

/**
 * Washi paper card — cream fill + brown-tinted shadow.
 * The shared shell for every raised surface (sidebar cards, dropdowns, modals).
 *
 * Defaults match the original sidebar `Card` shell so callers who only need a
 * plain card can omit all props. Extra classes compose via `cn`.
 */
export function Card({
  children,
  className = '',
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'card-paper shadow-paper rounded-[1.25rem] border border-border/60 p-5',
        className,
      )}
      {...props}
    >
      {children}
    </div>
  )
}
