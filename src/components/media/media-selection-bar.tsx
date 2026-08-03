'use client'

import { Heart, Tag as TagIcon, Trash2 } from 'lucide-react'

type MediaSelectionBarProps = {
  count: number
  onClear: () => void
  onCancel: () => void
  onFavorite: () => void
  onAddTag: () => void
  onDelete: () => void
}

export function MediaSelectionBar({
  count,
  onClear,
  onCancel,
  onFavorite,
  onAddTag,
  onDelete,
}: MediaSelectionBarProps) {
  return (
    <div
      role="region"
      aria-label="Pemilihan aktif"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border/60 bg-card/95 shadow-[0_-12px_40px_rgba(160,104,96,0.12)] backdrop-blur-md"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="mx-auto flex max-w-[1400px] items-center gap-2 px-4 py-3 sm:gap-3 sm:px-6 sm:py-4 lg:px-8">
        {/* Count — live region so SR announces selection changes */}
        <p
          aria-live="polite"
          className="shrink-0 text-[12px] font-semibold text-foreground-strong sm:text-[13px]"
        >
          <span className="mr-1 inline-grid min-w-[20px] place-items-center rounded-full bg-primary px-1.5 py-0.5 text-[11px] font-bold text-primary-foreground">
            {count}
          </span>
          {count === 1 ? 'foto dipilih' : 'foto dipilih'}
        </p>

        <div className="ml-auto flex shrink-0 items-center gap-1.5 sm:gap-2">
          <button
            type="button"
            onClick={onFavorite}
            className="inline-flex min-h-11 items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-[11.5px] font-semibold text-foreground-strong transition hover:border-primary/40 hover:text-primary sm:text-[12px]"
          >
            <Heart size={13} aria-hidden="true" />
            <span className="hidden sm:inline">Favorit</span>
          </button>
          <button
            type="button"
            onClick={onAddTag}
            className="inline-flex min-h-11 items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-[11.5px] font-semibold text-foreground-strong transition hover:border-primary/40 hover:text-primary sm:text-[12px]"
          >
            <TagIcon size={13} aria-hidden="true" />
            <span className="hidden sm:inline">Tag</span>
          </button>
          <button
            type="button"
            onClick={onDelete}
            className="inline-flex min-h-11 items-center gap-1.5 rounded-full border border-foreground-strong/30 bg-card px-3 py-1.5 text-[11.5px] font-semibold text-foreground-strong transition hover:bg-foreground-strong hover:text-card sm:text-[12px]"
          >
            <Trash2 size={13} aria-hidden="true" />
            <span className="hidden sm:inline">Hapus</span>
          </button>
        </div>

        <div className="ml-2 hidden h-6 w-px bg-border/60 sm:block" />

        <div className="hidden shrink-0 items-center gap-1.5 sm:flex">
          <button
            type="button"
            onClick={onClear}
            className="inline-flex min-h-11 items-center rounded-full px-3 text-[11.5px] font-semibold text-subtle-foreground transition hover:text-foreground-strong"
          >
            Bersihkan
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="inline-flex min-h-11 items-center rounded-full px-3 text-[11.5px] font-semibold text-subtle-foreground transition hover:text-foreground-strong"
          >
            Batal
          </button>
        </div>
      </div>
    </div>
  )
}
