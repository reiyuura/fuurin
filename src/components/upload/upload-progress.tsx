'use client'

import { cn } from '@/lib/utils'

type UploadProgressProps = {
  /** 0–100. */
  value: number
  /** Optional override for `aria-label` (default: 'Upload progress'). */
  label?: string
  className?: string
  /** Visual size — `sm` for inline (item rows), `md` for the global bar. */
  size?: 'sm' | 'md'
}

/**
 * Thin wrapper over native `<progress>` with accessible labelling.
 * Using `<progress>` instead of a custom bar gives free screen-reader
 * semantics (aria-valuenow / aria-valuemax) and keyboard nav.
 */
export function UploadProgress({ value, label, className, size = 'sm' }: UploadProgressProps) {
  const clamped = Math.max(0, Math.min(100, Math.round(value)))
  const heightClass = size === 'md' ? 'h-2.5' : 'h-1.5'
  return (
    <progress
      value={clamped}
      max={100}
      aria-label={label ?? 'Upload progress'}
      className={cn(
        'block w-full appearance-none overflow-hidden rounded-full border-0 bg-muted text-primary',
        heightClass,
        className,
      )}
    >
      {clamped}%
    </progress>
  )
}
