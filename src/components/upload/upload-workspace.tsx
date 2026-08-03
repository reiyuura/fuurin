'use client'

import { useCallback, useState } from 'react'
import { UploadDropzone } from '@/components/upload/upload-dropzone'
import { UploadQueueList } from '@/components/upload/upload-queue-list'
import { UploadSummary } from '@/components/upload/upload-summary'
import { UploadDetails } from '@/components/upload/upload-details'
import { useUploadWorker } from '@/components/upload/use-upload-worker'
import { AlbumEmptyState } from '@/components/ui/album-empty-state'

export function UploadWorkspace() {
  const worker = useUploadWorker()
  const [focusedId, setFocusedId] = useState<string | null>(null)
  const focused = focusedId ? worker.items.find((it) => it.id === focusedId) ?? null : null

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
