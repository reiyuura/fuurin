'use client'

import { useCallback, useEffect, useState } from 'react'
import { FolderInput, Loader2 } from 'lucide-react'
import { UploadDropzone } from '@/components/upload/upload-dropzone'
import { UploadQueueList } from '@/components/upload/upload-queue-list'
import { UploadSummary } from '@/components/upload/upload-summary'
import { UploadDetails } from '@/components/upload/upload-details'
import { useUploadWorker } from '@/components/upload/use-upload-worker'
import { AlbumEmptyState } from '@/components/ui/album-empty-state'
import { getApiClient } from '@/lib/repositories/api-client-provider'
import { attachUploadsToAlbum } from '@/lib/attach-uploads'
import { useToast } from '@/components/ui/toast'

export function UploadWorkspace() {
  const worker = useUploadWorker()
  const { toast } = useToast()
  const [focusedId, setFocusedId] = useState<string | null>(null)
  const focused = focusedId ? worker.items.find((it) => it.id === focusedId) ?? null : null

  // Attach-after-upload: a completed upload only stores the FILE — it
  // shows up nowhere until a Photo row is created in an album.
  const completed = worker.items.filter((it) => it.status === 'completed' && it.remoteUrl)
  const [albums, setAlbums] = useState<Array<{ slug: string; title: string }>>([])
  const [attachTo, setAttachTo] = useState('')
  const [attaching, setAttaching] = useState(false)

  useEffect(() => {
    if (completed.length === 0 || albums.length > 0) return
    getApiClient()
      .request<Array<{ slug: string; title: { en?: string; ja?: string } }>>({ method: 'GET', path: '/albums/summaries' })
      .then((res) => {
        if (res.ok) {
          const list = res.data.map((a) => ({ slug: a.slug, title: a.title.en ?? a.title.ja ?? a.slug }))
          setAlbums(list)
          if (list.length > 0) setAttachTo((cur) => cur || list[0].slug)
        }
      })
      .catch(() => {})
  }, [completed.length, albums.length])

  const handleAttach = async () => {
    if (!attachTo || attaching) return
    setAttaching(true)
    const r = await attachUploadsToAlbum(
      getApiClient(),
      attachTo,
      completed.map((it) => ({ url: it.remoteUrl!, name: it.name, orientation: it.width && it.height && it.height > it.width ? 'portrait' as const : 'landscape' as const })),
    )
    setAttaching(false)
    if (r.failed === 0) {
      toast('success', `${r.attached} foto dilampirkan ke album.`)
      worker.clearFinished()
    } else {
      toast('error', `${r.failed} dari ${completed.length} foto gagal dilampirkan.`)
    }
  }

  const onFiles = useCallback(
    (files: File[]) => {
      void worker.addFiles(files)
    },
    [worker],
  )

  return (
    <div className="space-y-6">
      <UploadDropzone onFiles={onFiles} />

      {/* Empty hint when no items at all — guides users toward the dropzone */}
      {worker.items.length === 0 && (
        <AlbumEmptyState
          illustration="search"
          title="Belum ada file di antrian"
          description="Tarik foto ke area di atas, atau pilih file dari perangkat untuk memulai."
          className="py-16"
        />
      )}

      {worker.items.length > 0 && (
        <UploadSummary
          items={worker.items}
          onClearFinished={worker.clearFinished}
          onReset={worker.reset}
        />
      )}

      {/* Attach completed uploads to an album — otherwise the files stay
          invisible (storage-only) and users think the upload "didn't work". */}
      {completed.length > 0 && albums.length > 0 && (
        <div className="flex flex-wrap items-center gap-3 rounded-[1.25rem] border border-[#D9A441]/30 bg-[#D9A441]/10 px-5 py-4">
          <p className="text-[13px] font-medium text-foreground-strong">
            {completed.length} foto selesai diunggah — lampirkan agar tampil di album:
          </p>
          <select
            value={attachTo}
            onChange={(e) => setAttachTo(e.target.value)}
            aria-label="Pilih album tujuan"
            className="rounded-xl border border-border bg-card px-3 py-2 text-[13px] text-foreground-strong focus:outline-none focus:ring-2 focus:ring-primary/30"
          >
            {albums.map((a) => <option key={a.slug} value={a.slug}>{a.title}</option>)}
          </select>
          <button
            onClick={handleAttach}
            disabled={attaching}
            className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-[13px] font-medium text-white hover:bg-primary/90 transition disabled:opacity-50"
          >
            {attaching ? <Loader2 size={13} className="animate-spin" /> : <FolderInput size={13} aria-hidden="true" />}
            {attaching ? 'Melampirkan...' : 'Lampirkan'}
          </button>
        </div>
      )}

      <UploadQueueList
        items={worker.items}
        onCancel={worker.cancel}
        onRetry={worker.retry}
        onRemove={worker.remove}
        onOpen={(id) => setFocusedId(id)}
      />

      <UploadDetails item={focused} onClose={() => setFocusedId(null)} />
    </div>
  )
}
