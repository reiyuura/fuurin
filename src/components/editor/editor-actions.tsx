'use client'

/**
 * EditorActions — render-only save/publish/delete bar with aria-live.
 *
 * Owns no state. All callbacks come from the feature hook. The save
 * status string is announced through a polite live region so SR users
 * hear "Tersimpan" without focus shifts.
 */

import { AlertTriangle, Loader2, Save, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { SaveStatus } from '@/hooks/use-album-editor'
import type { AlbumVisibility } from '@/types/album-editor'

export type EditorActionsProps = {
  status: SaveStatus
  dirty: boolean
  canPublish: boolean
  visibility: AlbumVisibility
  isNew: boolean
  photoCount: number
  onSaveDraft: () => void
  onPublish: () => void
  onRequestDelete: () => void
}

export function EditorActions({
  status,
  dirty,
  canPublish,
  visibility,
  isNew,
  photoCount,
  onSaveDraft,
  onPublish,
  onRequestDelete,
}: EditorActionsProps) {
  const saving = status.kind === 'saving'
  const publishLabel = isNew
    ? 'Publish Album'
    : visibility === 'published'
      ? 'Simpan & Publish'
      : 'Publish'

  const liveText = (() => {
    switch (status.kind) {
      case 'saving':
        return 'Menyimpan…'
      case 'saved':
        return 'Tersimpan'
      case 'error':
        return `Gagal: ${status.message}`
      default:
        return dirty ? 'Ada perubahan belum disimpan' : 'Draft tersimpan'
    }
  })()

  return (
    <section
      aria-labelledby="editor-actions-heading"
      className="card-paper sticky bottom-0 z-10 mt-6 flex flex-wrap items-center justify-between gap-3 rounded-[1.5rem] border border-border/60 px-4 py-3 backdrop-blur-md sm:px-5 sm:py-3.5"
    >
      <div className="flex items-center gap-2.5">
        <span
          aria-hidden="true"
          className={
            'h-2.5 w-2.5 rounded-full ' +
            (status.kind === 'error'
              ? 'bg-destructive'
              : dirty
                ? 'bg-amber-500'
                : 'bg-emerald-500/80')
          }
        />
        <h3 id="editor-actions-heading" className="sr-only">
          Aksi Editor
        </h3>
        <p
          aria-live="polite"
          className="text-[12.5px] font-medium text-foreground-strong"
          data-status={status.kind}
        >
          {liveText}
        </p>
        {!canPublish && (
          <span className="hidden items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-[10.5px] font-semibold text-amber-700 sm:inline-flex dark:text-amber-300">
            <AlertTriangle size={10} aria-hidden="true" />
            Publish butuh title + ≥1 foto
          </span>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {!isNew && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onRequestDelete}
            disabled={saving}
            className="text-muted-foreground hover:text-destructive"
          >
            <Trash2 size={13} aria-hidden="true" /> Hapus Album
          </Button>
        )}
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onSaveDraft}
          disabled={saving || !dirty}
        >
          {saving ? <Loader2 size={13} className="animate-spin" aria-hidden="true" /> : <Save size={13} aria-hidden="true" />}
          Simpan Draft
        </Button>
        <Button
          type="button"
          size="sm"
          onClick={onPublish}
          disabled={saving || !canPublish}
          title={!canPublish ? 'Lengkapi title + tanggal dan tambahkan minimal 1 foto' : undefined}
        >
          {publishLabel}
          {photoCount > 0 && (
            <span className="ml-1 rounded-full bg-primary-foreground/20 px-1.5 text-[10px] font-bold">
              {photoCount}
            </span>
          )}
        </Button>
      </div>
    </section>
  )
}
