'use client'

/**
 * DeleteAlbumDialog — render-only confirmation modal.
 *
 * Uses the umbrella Radix AlertDialog re-export. AlertDialog has no
 * built-in Footer subcomponent — the action row is a plain div with
 * flex layout. Cancel uses `asChild` so it forwards refs/handlers.
 */

import { AlertDialog } from 'radix-ui'
import { Trash2 } from 'lucide-react'
import type { AlbumDraft } from '@/types/album-editor'

export type DeleteAlbumDialogProps = {
  album: AlbumDraft | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
}

export function DeleteAlbumDialog({ album, open, onOpenChange, onConfirm }: DeleteAlbumDialogProps) {
  return (
    <AlertDialog.Root open={open} onOpenChange={onOpenChange}>
      <AlertDialog.Portal>
        <AlertDialog.Overlay className="fixed inset-0 z-50 bg-black/55 backdrop-blur-sm data-[state=open]:animate-in data-[state=open]:fade-in" />
        <AlertDialog.Content
          className="card-paper fixed left-1/2 top-1/2 z-50 w-[min(92vw,440px)] -translate-x-1/2 -translate-y-1/2 rounded-[1.5rem] border border-border/70 p-6 shadow-[0_24px_70px_rgba(0,0,0,0.22)] focus:outline-none"
          onOpenAutoFocus={(e) => {
            // Avoid grabbing focus on Cancel — let Confirm be the safer default.
            e.preventDefault()
          }}
        >
          <div className="mb-3 flex items-start gap-3">
            <span
              aria-hidden="true"
              className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-destructive/10 text-destructive"
            >
              <Trash2 size={18} />
            </span>
            <div>
              <AlertDialog.Title className="font-jp text-[16px] font-bold tracking-tight text-foreground-strong">
                Hapus album ini?
              </AlertDialog.Title>
              <AlertDialog.Description className="mt-1 text-[12.5px] text-muted-foreground">
                Album <strong className="text-foreground-strong">{album?.title || '(tanpa judul)'}</strong> akan dihapus dari mock repository. Aksi ini tidak dapat dibatalkan.
              </AlertDialog.Description>
            </div>
          </div>

          <div className="mt-5 flex flex-row justify-end gap-2">
            <AlertDialog.Cancel asChild>
              <button
                type="button"
                className="rounded-[14px] border border-border bg-background/60 px-4 py-2 text-[13px] font-semibold text-foreground-strong hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
              >
                Batal
              </button>
            </AlertDialog.Cancel>
            <AlertDialog.Action asChild>
              <button
                type="button"
                onClick={onConfirm}
                className="rounded-[14px] bg-destructive px-4 py-2 text-[13px] font-semibold text-primary-foreground shadow-[0_6px_18px_rgba(215,90,90,0.28)] hover:bg-destructive/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive/50"
              >
                Hapus
              </button>
            </AlertDialog.Action>
          </div>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  )
}
