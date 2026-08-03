'use client'

import { useEffect, useId, useRef, useState, type ChangeEvent, type FormEvent } from 'react'
import { Search, X } from 'lucide-react'
import { cn } from '@/lib/utils'

type AlbumSearchProps = {
  /** Fires after debounce, with the current query string. */
  onValueChange: (value: string) => void

  /* ── Controlled / uncontrolled ───────────────────────────── */
  /** Controlled value. Omit to use uncontrolled (defaultValue). */
  value?: string
  /** Initial value for uncontrolled mode. */
  defaultValue?: string

  /* ── Behaviour ────────────────────────────────────────────── */
  /** Debounce window in milliseconds. */
  debounceMs?: number
  /** Show keyboard shortcut hint. */
  showShortcut?: boolean
  /** Placeholder text. */
  placeholder?: string

  /* ── Layout ───────────────────────────────────────────────── */
  className?: string
}

export function AlbumSearch({
  onValueChange,
  value: controlledValue,
  defaultValue = '',
  debounceMs = 300,
  showShortcut = true,
  placeholder = 'Cari album...',
  className,
}: AlbumSearchProps) {
  const isControlled = controlledValue !== undefined

  const [internal, setInternal] = useState(defaultValue)
  const displayValue = isControlled ? controlledValue : internal
  const inputId = useId()
  const inputRef = useRef<HTMLInputElement>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout>>(null)

  /* ── Emit debounced ──────────────────────────────────────── */
  function emit(val: string) {
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => onValueChange(val), debounceMs)
  }

  useEffect(() => () => {
    if (timerRef.current) clearTimeout(timerRef.current)
  }, [])

  /* ── External sync (uncontrolled): when defaultValue changes
     (e.g. URL back/forward or a Reset button) and the user is not
     actively typing, adopt the new value so the input never shows
     a stale query. While focused, internal state wins. ──────── */
  useEffect(() => {
    if (!isControlled && document.activeElement !== inputRef.current) {
      setInternal(defaultValue)
    }
  }, [defaultValue, isControlled])

  /* ── Handlers ────────────────────────────────────────────── */
  function handleChange(e: ChangeEvent<HTMLInputElement>) {
    const v = e.target.value
    if (!isControlled) setInternal(v)
    emit(v)
  }

  function handleClear() {
    if (!isControlled) setInternal('')
    // Fire immediately (no debounce) so the grid resets instantly.
    if (timerRef.current) clearTimeout(timerRef.current)
    onValueChange('')
    inputRef.current?.focus()
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Escape') {
      if (displayValue) {
        handleClear()
      } else {
        inputRef.current?.blur()
      }
    }
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
  }

  return (
    <form
      role="search"
      onSubmit={handleSubmit}
      className={cn(
        'flex h-11 w-full items-center gap-3 rounded-full border border-border/70 bg-card px-4 transition duration-300 focus-within:border-primary/45 focus-within:shadow-[0_4px_18px_rgba(200,124,141,0.12)] hover:border-primary/35',
        className,
      )}
    >
      {/* Icon — purely decorative */}
      <Search
        size={16}
        className="pointer-events-none shrink-0 text-subtle-foreground"
        aria-hidden="true"
      />

      <label htmlFor={inputId} className="sr-only">
        {placeholder}
      </label>

      <input
        ref={inputRef}
        id={inputId}
        type="search"
        value={displayValue}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        autoComplete="off"
        spellCheck={false}
        enterKeyHint="search"
        className="min-w-0 flex-1 bg-transparent font-jp text-[13px] text-foreground-strong outline-none placeholder:text-subtle-foreground"
      />

      {/* Clear button — shown only when there is text */}
      {displayValue.length > 0 && (
        <button
          type="button"
          onClick={handleClear}
          aria-label="Hapus pencarian"
          className="grid size-6 shrink-0 place-items-center rounded-full text-muted-foreground transition hover:bg-hover hover:text-primary"
        >
          <X size={13} aria-hidden="true" />
        </button>
      )}

      {/* Shortcut hint — decorative */}
      {showShortcut && (
        <kbd
          aria-hidden="true"
          className="hidden shrink-0 rounded-md border border-border/70 bg-card px-1.5 py-0.5 font-mono text-[9px] font-semibold text-muted-foreground sm:inline"
        >
          Ctrl+K
        </kbd>
      )}
    </form>
  )
}
