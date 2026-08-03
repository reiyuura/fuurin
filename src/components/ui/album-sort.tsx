'use client'

import { useEffect, useRef, useState } from 'react'
import { ArrowUpDown, Check, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Dropdown } from '@/components/ui/dropdown'

/* ── Public model ───────────────────────────────────────────── */

export type SortOption = {
  value: string
  label: string
}

type AlbumSortProps = {
  options: SortOption[]
  active: string
  onChange: (value: string) => void
  className?: string
}

/* ── Component ──────────────────────────────────────────────── */

export function AlbumSort({
  options,
  active,
  onChange,
  className,
}: AlbumSortProps) {
  const [open, setOpen] = useState(false)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const selected = options.find((o) => o.value === active) ?? options[0]

  /* Click outside → close */
  useEffect(() => {
    if (!open) return
    function close() {
      setOpen(false)
    }
    window.addEventListener('click', close)
    return () => window.removeEventListener('click', close)
  }, [open])

  function handleSelect(value: string) {
    onChange(value)
    setOpen(false)
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLButtonElement>) {
    if (e.key === 'Escape') {
      setOpen(false)
      triggerRef.current?.focus()
    }
  }

  return (
    <div className={cn('relative', className)}>
      {/* ── Trigger ────────────────────────────────── */}
      <button
        ref={triggerRef}
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          setOpen((v) => !v)
        }}
        onKeyDown={handleKeyDown}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`Urutkan: ${selected?.label}`}
        className={cn(
          'inline-flex items-center gap-2 rounded-full border border-border/70 bg-card px-3.5 py-2',
          'text-[12px] font-semibold text-foreground-strong',
          'transition duration-300 hover:border-primary/35',
          'h-10 min-w-[120px]',
        )}
      >
        <ArrowUpDown size={14} className="shrink-0 text-subtle-foreground" aria-hidden="true" />
        <span className="flex-1 text-left">{selected?.label}</span>
        <ChevronDown
          size={12}
          aria-hidden="true"
          className={cn(
            'shrink-0 text-subtle-foreground transition-transform',
            open && 'rotate-180',
          )}
        />
      </button>

      {/* ── Dropdown ──────────────────────────────── */}
      {open && (
        <Dropdown
          role="listbox"
          onClick={(e) => e.stopPropagation()}
          className="min-w-[180px] shadow-paper-lift"
        >
          {options.map((opt) => {
            const isActive = opt.value === active

            return (
              <button
                key={opt.value}
                type="button"
                role="option"
                aria-selected={isActive}
                onClick={() => handleSelect(opt.value)}
                className={cn(
                  'flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-[12px] transition',
                  isActive
                    ? 'bg-primary-subtle font-semibold text-primary-ink'
                    : 'font-medium text-foreground-strong hover:bg-hover',
                )}
              >
                {opt.label}
                {isActive && <Check size={13} aria-hidden="true" />}
              </button>
            )
          })}
        </Dropdown>
      )}
    </div>
  )
}
