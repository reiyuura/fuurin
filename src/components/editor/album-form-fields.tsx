'use client'

/**
 * AlbumFormFields — render-only metadata form.
 *
 * No state, no logic — every field delegates to callbacks. Receives
 * the current draft snapshot and per-field error strings. Layout uses
 * the existing semantic tokens (no hardcoded colors).
 */

import { forwardRef } from 'react'
import { CalendarDays, FileText, MapPin, Type } from 'lucide-react'
import type { AlbumDraft, AlbumVisibility } from '@/types/album-editor'

export type AlbumFormFieldsProps = {
  draft: AlbumDraft
  errors: Record<string, string>
  disabled?: boolean
  onTitle: (v: string) => void
  onDescription: (v: string) => void
  onDate: (v: string) => void
  onLocation: (v: string) => void
  onVisibility: (v: AlbumVisibility) => void
}

export const AlbumFormFields = forwardRef<HTMLInputElement, AlbumFormFieldsProps>(
  function AlbumFormFields(
    { draft, errors, disabled, onTitle, onDescription, onDate, onLocation, onVisibility },
    titleRef,
  ) {
    return (
      <section
        aria-labelledby="editor-fields-heading"
        className="card-paper rounded-[1.5rem] border border-border/60 p-5 sm:p-6"
      >
        <h2
          id="editor-fields-heading"
          className="mb-4 font-jp text-[15px] font-bold tracking-tight text-foreground-strong sm:text-[16px]"
        >
          Detail Album
        </h2>

        <div className="grid gap-4 sm:grid-cols-2">
          {/* Title — full width */}
          <Field
            id="album-title"
            label="Judul"
            hint="Maksimal 80 karakter"
            error={errors.title}
            className="sm:col-span-2"
          >
            <div className="relative">
              <Type
                size={14}
                aria-hidden="true"
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/70"
              />
              <input
                ref={titleRef}
                id="album-title"
                type="text"
                value={draft.title}
                onChange={(e) => onTitle(e.target.value)}
                disabled={disabled}
                maxLength={80}
                placeholder="cth. Hanami 2026"
                autoComplete="off"
                className="w-full rounded-[14px] border border-border bg-background/60 py-2.5 pl-9 pr-3 text-[14px] text-foreground-strong placeholder:text-muted-foreground/60 focus:border-primary/60 focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
          </Field>

          {/* Description */}
          <Field
            id="album-description"
            label="Deskripsi"
            hint={`${draft.description.length} / 400`}
            error={errors.description}
            className="sm:col-span-2"
          >
            <div className="relative">
              <FileText
                size={14}
                aria-hidden="true"
                className="pointer-events-none absolute left-3 top-3 text-muted-foreground/70"
              />
              <textarea
                id="album-description"
                value={draft.description}
                onChange={(e) => onDescription(e.target.value)}
                disabled={disabled}
                rows={3}
                maxLength={400}
                placeholder="Cerita singkat di balik album ini…"
                className="w-full resize-none rounded-[14px] border border-border bg-background/60 py-2.5 pl-9 pr-3 text-[14px] text-foreground-strong placeholder:text-muted-foreground/60 focus:border-primary/60 focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
          </Field>

          {/* Date */}
          <Field id="album-date" label="Tanggal" error={errors.date}>
            <div className="relative">
              <CalendarDays
                size={14}
                aria-hidden="true"
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/70"
              />
              <input
                id="album-date"
                type="date"
                value={draft.date}
                onChange={(e) => onDate(e.target.value)}
                disabled={disabled}
                className="w-full rounded-[14px] border border-border bg-background/60 py-2.5 pl-9 pr-3 text-[14px] text-foreground-strong focus:border-primary/60 focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
          </Field>

          {/* Location */}
          <Field id="album-location" label="Lokasi">
            <div className="relative">
              <MapPin
                size={14}
                aria-hidden="true"
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/70"
              />
              <input
                id="album-location"
                type="text"
                value={draft.location}
                onChange={(e) => onLocation(e.target.value)}
                disabled={disabled}
                maxLength={80}
                placeholder="cth. Ueno Park, Tokyo"
                autoComplete="off"
                className="w-full rounded-[14px] border border-border bg-background/60 py-2.5 pl-9 pr-3 text-[14px] text-foreground-strong placeholder:text-muted-foreground/60 focus:border-primary/60 focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
          </Field>

          {/* Visibility — radio group */}
          <Field id="album-visibility" label="Visibilitas" className="sm:col-span-2">
            <div
              role="radiogroup"
              aria-labelledby="album-visibility"
              className="flex flex-wrap gap-2"
            >
              <VisibilityChip
                value="draft"
                active={draft.visibility === 'draft'}
                onSelect={() => onVisibility('draft')}
                disabled={disabled}
                label="Draft"
                hint="Tidak tampil di publik"
              />
              <VisibilityChip
                value="published"
                active={draft.visibility === 'published'}
                onSelect={() => onVisibility('published')}
                disabled={disabled}
                label="Published"
                hint="Tampil di halaman album"
              />
            </div>
          </Field>
        </div>
      </section>
    )
  },
)

type FieldProps = {
  id: string
  label: string
  hint?: string
  error?: string
  className?: string
  children: React.ReactNode
}

function Field({ id, label, hint, error, className, children }: FieldProps) {
  const hintId = hint ? `${id}-hint` : undefined
  const errorId = error ? `${id}-err` : undefined
  const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined
  return (
    <div className={className}>
      <label
        htmlFor={id}
        className="mb-1.5 inline-flex items-center gap-1.5 text-[11.5px] font-semibold uppercase tracking-[.14em] text-muted-foreground"
      >
        {label}
        {hint && (
          <span id={hintId} className="font-normal normal-case tracking-normal text-muted-foreground/70">
            · {hint}
          </span>
        )}
      </label>
      <div aria-describedby={describedBy}>{children}</div>
      {error && (
        <p id={errorId} role="alert" className="mt-1 text-[11.5px] font-medium text-destructive">
          {error}
        </p>
      )}
    </div>
  )
}

type VisibilityChipProps = {
  value: AlbumVisibility
  active: boolean
  onSelect: () => void
  disabled?: boolean
  label: string
  hint: string
}

function VisibilityChip({ value, active, onSelect, disabled, label, hint }: VisibilityChipProps) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={active}
      data-value={value}
      onClick={onSelect}
      disabled={disabled}
      className={
        'group flex min-w-[140px] flex-1 flex-col items-start gap-0.5 rounded-[14px] border px-3.5 py-2.5 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ' +
        (active
          ? 'border-primary/60 bg-primary/10 shadow-[0_4px_14px_rgba(200,124,141,0.18)]'
          : 'border-border bg-background/40 hover:border-primary/40 hover:bg-primary/5')
      }
    >
      <span className="text-[13px] font-semibold text-foreground-strong">{label}</span>
      <span className="text-[11px] text-muted-foreground">{hint}</span>
    </button>
  )
}
