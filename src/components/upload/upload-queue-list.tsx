'use client'

import { AnimatePresence } from 'framer-motion'
import { UploadItemCard } from '@/components/upload/upload-item-card'
import { groupByStatus } from '@/lib/upload-utils'
import type { UploadItem } from '@/types/upload'

type UploadQueueListProps = {
  items: UploadItem[]
  onCancel: (id: string) => void
  onRetry: (id: string) => void
  onRemove: (id: string) => void
  onOpen: (id: string) => void
}

const GROUP_HEADINGS: Partial<Record<UploadItem['status'], string>> = {
  uploading: 'Mengunggah',
  validating: 'Memvalidasi',
  ready: 'Siap diunggah',
  failed: 'Gagal',
  cancelled: 'Dibatalkan',
  completed: 'Selesai',
}

/**
 * Pure UI — receives items and dispatches events. Grouping logic
 * lives in `upload-utils.ts` so the UI never mutates state itself.
 */
export function UploadQueueList({ items, onCancel, onRetry, onRemove, onOpen }: UploadQueueListProps) {
  const groups = groupByStatus(items)
  if (items.length === 0) return null

  return (
    <section aria-label="Antrian upload" className="space-y-6">
      {groups.map((group) => (
        <div key={group.status}>
          {GROUP_HEADINGS[group.status] && (
            <h2 className="mb-3 px-1 text-[10px] font-bold uppercase tracking-[.18em] text-subtle-foreground">
              {GROUP_HEADINGS[group.status]} · {group.items.length}
            </h2>
          )}
          <ul className="space-y-2.5">
            <AnimatePresence initial={false}>
              {group.items.map((item) => (
                <UploadItemCard
                  key={item.id}
                  item={item}
                  onCancel={onCancel}
                  onRetry={onRetry}
                  onRemove={onRemove}
                  onOpen={onOpen}
                />
              ))}
            </AnimatePresence>
          </ul>
        </div>
      ))}
    </section>
  )
}
