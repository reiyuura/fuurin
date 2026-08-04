'use client'

/**
 * DeleteAlbumButton — inline delete with confirmation dialog.
 */

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Trash2 } from 'lucide-react'
import { getApiClient } from '@/lib/repositories/api-client-provider'
import { FetchAlbumRepository } from '@/lib/repositories/fetch-album-repository'
import { useToast } from '@/components/ui/toast'

type Props = { slug: string; title: string }

export function DeleteAlbumButton({ slug, title }: Props) {
  const router = useRouter()
  const { toast } = useToast()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleDelete = async () => {
    setLoading(true)
    const repo = new FetchAlbumRepository(getApiClient())
    const res = await repo.deleteAlbum(slug)
    setLoading(false)
    if (res.ok) {
      toast('success', `Album "${title}" dihapus.`)
      setOpen(false)
      router.refresh()
    } else {
      toast('error', `Gagal menghapus: ${res.error.message}`)
    }
  }

  return (
    <>
      <button
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setOpen(true) }}
        className="grid size-8 place-items-center rounded-full bg-card/90 text-muted-foreground shadow-sm transition hover:bg-error hover:text-white"
        aria-label={`Hapus ${title}`}
      >
        <Trash2 size={14} aria-hidden="true" />
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4" onClick={() => setOpen(false)}>
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 shadow-xl"
          >
            <h2 className="text-base font-bold text-foreground-strong">Hapus Album</h2>
            <p className="mt-2 text-[13px] text-muted-foreground">
              Album <strong className="text-foreground-strong">{title}</strong> akan dihapus permanen. Semua foto di dalamnya juga akan hilang.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => setOpen(false)}
                className="rounded-xl px-4 py-2 text-[13px] font-medium text-foreground-strong transition hover:bg-hover"
                disabled={loading}
              >
                Batal
              </button>
              <button
                onClick={handleDelete}
                disabled={loading}
                className="rounded-xl bg-error px-4 py-2 text-[13px] font-medium text-white transition hover:bg-error/90 disabled:opacity-50"
              >
                {loading ? 'Menghapus...' : 'Hapus'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}