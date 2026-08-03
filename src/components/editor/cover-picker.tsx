'use client'

/**
 * CoverPicker — render-only cover selection.
 *
 * Uses the existing `MediaGrid` for the picker body. No selection
 * state lives here — the parent owns `coverMediaId` via `onChange`.
 */

import { useEffect, useMemo, useState } from 'react'
import Image from 'next/image'
import { Check, ImageIcon, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { MediaGrid } from '@/components/media/media-grid'
import { AlbumEmptyState } from '@/components/ui/album-empty-state'
import type { MediaItem } from '@/types/media'

export type CoverPickerProps = {
  items: MediaItem[]
  coverMediaId: string | null
  onChange: (id: string | null) => void
  /** Optional cover preview when no media has been picked yet. */
  fallbackSrc?: string
}

export function CoverPicker({ items, coverMediaId, onChange, fallbackSrc }: CoverPickerProps) {
  const [open, setOpen] = useState(false)

  const current = useMemo(
    () => items.find((m) => m.id === coverMediaId) ?? null,
    [items, coverMediaId],
  )

  // Lock body scroll while the picker drawer is open.
  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [open])

  // Esc to close.
  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  return (
    <section
      aria-labelledby="editor-cover-heading"
      className="card-paper rounded-[1.5rem] border border-border/60 p-5 sm:p-6"
    >
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2
          id="editor-cover-heading"
          className="font-jp text-[15px] font-bold tracking-tight text-foreground-strong sm:text-[16px]"
        >
          Cover
        </h2>
        {coverMediaId && (
          <Button
            type="button"
            variant="ghost"
            size="xs"
            onClick={() => onChange(null)}
            className="text-muted-foreground"
          >
            <X size={12} aria-hidden="true" /> Hapus cover
          </Button>
        )}
      </div>

      {/* Preview */}
      <div className="relative aspect-[16/9] w-full overflow-hidden rounded-[1.25rem] border border-border/60 bg-muted">
        {current ? (
          <>
            <Image
              src={current.src}
              alt="Pratinjau cover"
              fill
              sizes="(max-width: 768px) 100vw, 720px"
              className="object-cover"
            />
            <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-2 bg-gradient-to-t from-black/70 via-black/30 to-transparent p-3 text-white">
              <span className="truncate text-[12px] font-semibold drop-shadow-[0_1px_4px_rgba(0,0,0,0.5)]">
                {current.id}
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-primary/90 px-2 py-0.5 text-[10.5px] font-semibold">
                <Check size={11} aria-hidden="true" /> Cover aktif
              </span>
            </div>
          </>
        ) : fallbackSrc ? (
          <>
            <Image
              src={fallbackSrc}
              alt="Cover sementara"
              fill
              sizes="(max-width: 768px) 100vw, 720px"
              className="object-cover opacity-90"
            />
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-3 text-[11px] text-white/90">
              Cover otomatis dari foto pertama. Pilih foto lain untuk menimpa.
            </div>
          </>
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-muted-foreground">
            <ImageIcon size={28} aria-hidden="true" strokeWidth={1.5} />
            <p className="text-[12px]">Belum ada cover. Pilih dari Media Library.</p>
          </div>
        )}
      </div>

      <div className="mt-3 flex items-center justify-between gap-3">
        <p className="text-[11.5px] text-muted-foreground">
          Foto pertama jadi cover otomatis jika belum dipilih.
        </p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setOpen(true)}
          className="shrink-0"
        >
          <ImageIcon size={13} aria-hidden="true" />
          {current ? 'Ganti cover' : 'Pilih cover'}
        </Button>
      </div>

      {/* Drawer */}
      {open && (
        <CoverDrawer
          items={items}
          selectedId={coverMediaId}
          onPick={(id) => {
            onChange(id)
            setOpen(false)
          }}
          onClose={() => setOpen(false)}
        />
      )}
    </section>
  )
}

type CoverDrawerProps = {
  items: MediaItem[]
  selectedId: string | null
  onPick: (id: string) => void
  onClose: () => void
}

function CoverDrawer({ items, selectedId, onPick, onClose }: CoverDrawerProps) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="cover-picker-title"
      className="fixed inset-0 z-50 flex items-end justify-center sm:items-center"
    >
      <button
        type="button"
        aria-label="Tutup pemilih cover"
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="card-paper relative z-10 flex h-[88vh] w-full flex-col overflow-hidden rounded-t-[1.5rem] border border-border shadow-[0_-12px_50px_rgba(0,0,0,0.18)] sm:h-[80vh] sm:max-w-3xl sm:rounded-[1.5rem]">
        <header className="flex items-center justify-between border-b border-border/60 px-4 py-3 sm:px-6 sm:py-4">
          <h3 id="cover-picker-title" className="font-jp text-[14px] font-bold tracking-tight text-foreground-strong sm:text-[15px]">
            Pilih Cover
          </h3>
          <Button type="button" variant="ghost" size="icon-sm" onClick={onClose} aria-label="Tutup">
            <X size={16} aria-hidden="true" />
          </Button>
        </header>
        <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-6 sm:py-5">
          {items.length === 0 ? (
            <AlbumEmptyState
              title="Belum ada foto"
              description="Tambahkan foto lewat halaman Media Library dulu."
            />
          ) : (
            <MediaGrid
              items={items}
              selectable
              selectedIds={new Set(selectedId ? [selectedId] : [])}
              onToggleSelect={(id) => onPick(id)}
            />
          )}
        </div>
        <footer className="flex items-center justify-end gap-2 border-t border-border/60 px-4 py-3 sm:px-6 sm:py-4">
          <Button type="button" variant="outline" size="sm" onClick={onClose}>
            Batal
          </Button>
        </footer>
      </div>
    </div>
  )
}
