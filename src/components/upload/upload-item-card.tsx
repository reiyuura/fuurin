'use client'

import { memo } from 'react'
import { motion } from 'framer-motion'
import { Check, ImageIcon, RotateCcw, Trash2, X } from 'lucide-react'
import type { UploadItem } from '@/types/upload'
import { formatBytes } from '@/lib/upload-utils'
import { Tag } from '@/components/ui/tag'
import { UploadProgress } from '@/components/upload/upload-progress'
import { cn } from '@/lib/utils'

type UploadItemCardProps = {
  item: UploadItem
  onCancel: (id: string) => void
  onRetry: (id: string) => void
  onRemove: (id: string) => void
  onOpen: (id: string) => void
}

const STATUS_LABEL: Record<UploadItem['status'], string> = {
  queued: 'Antri',
  validating: 'Memvalidasi',
  ready: 'Siap',
  uploading: 'Mengunggah',
  completed: 'Selesai',
  failed: 'Gagal',
  cancelled: 'Dibatalkan',
}

/**
 * Memoized per-item card. Only re-renders when its own `item`
 * reference changes — long queues don't force every card to repaint.
 */
export const UploadItemCard = memo(function UploadItemCard({
  item,
  onCancel,
  onRetry,
  onRemove,
  onOpen,
}: UploadItemCardProps) {
  return (
    <motion.li
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.98 }}
      transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
      className={cn(
        'group flex items-start gap-3 rounded-2xl border bg-card p-3 transition sm:gap-4 sm:p-4',
        item.status === 'failed' && 'border-foreground-strong/40',
        item.status === 'completed' && 'border-accent/40',
      )}
      data-status={item.status}
      aria-label={`Upload ${item.name}`}
    >
      {/* Thumbnail */}
      <button
        type="button"
        onClick={() => onOpen(item.id)}
        aria-label={`Buka preview ${item.name}`}
        className="relative size-14 shrink-0 overflow-hidden rounded-xl bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary sm:size-16"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={item.previewUrl}
          alt=""
          className="size-full object-cover"
          loading="lazy"
        />
      </button>

      {/* Body */}
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="min-w-0 truncate text-[12.5px] font-semibold text-foreground-strong sm:text-[13px]">
            {item.name}
          </p>
          <Tag size="sm" variant="chip" className="shrink-0 [&:hover]:translate-x-0">
            <span
              className={cn(
                'mr-1 inline-block size-1.5 rounded-full',
                item.status === 'uploading' && 'bg-primary',
                item.status === 'completed' && 'bg-accent',
                item.status === 'failed' && 'bg-foreground-strong',
                (item.status === 'queued' || item.status === 'validating' || item.status === 'ready' || item.status === 'cancelled') && 'bg-subtle-foreground',
              )}
              aria-hidden="true"
            />
            {STATUS_LABEL[item.status]}
          </Tag>
        </div>
        <p className="mt-0.5 text-[11px] text-muted-foreground">
          {formatBytes(item.bytes)}
          {item.width && item.height && (
            <>
              {' · '}
              <span className="inline-flex items-center gap-1">
                <ImageIcon size={10} aria-hidden="true" />
                {item.width}×{item.height}
              </span>
            </>
          )}
        </p>

        {/* Progress */}
        {(item.status === 'uploading' || item.status === 'completed' || item.status === 'failed') && (
          <div className="mt-2">
            <UploadProgress
              value={item.progress}
              size="sm"
              label={`Upload progress ${item.name}: ${item.progress}%`}
            />
            <div className="mt-1 flex items-center justify-between text-[10.5px]">
              <span className="text-subtle-foreground">{item.progress}%</span>
              {item.status === 'failed' && item.error && (
                <span role="alert" className="max-w-[60%] truncate text-right text-foreground-strong">
                  {item.error}
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex shrink-0 items-center gap-1.5">
        {item.status === 'uploading' && (
          <button
            type="button"
            onClick={() => onCancel(item.id)}
            aria-label={`Batalkan upload ${item.name}`}
            className="grid size-9 place-items-center rounded-full border border-border bg-card text-muted-foreground transition hover:border-foreground-strong/40 hover:text-foreground-strong"
          >
            <X size={14} aria-hidden="true" />
          </button>
        )}
        {item.status === 'failed' && (
          <button
            type="button"
            onClick={() => onRetry(item.id)}
            aria-label={`Coba ulang upload ${item.name}`}
            className="grid size-9 place-items-center rounded-full border border-border bg-card text-muted-foreground transition hover:border-primary/40 hover:text-primary"
          >
            <RotateCcw size={14} aria-hidden="true" />
          </button>
        )}
        {item.status === 'completed' && (
          <span
            className="grid size-9 place-items-center rounded-full bg-accent-subtle text-accent-ink"
            aria-label="Selesai"
          >
            <Check size={14} aria-hidden="true" />
          </span>
        )}
        <button
          type="button"
          onClick={() => onRemove(item.id)}
          aria-label={`Hapus ${item.name} dari antrian`}
          className="grid size-9 place-items-center rounded-full border border-border bg-card text-muted-foreground transition hover:border-foreground-strong/40 hover:text-foreground-strong"
        >
          <Trash2 size={13} aria-hidden="true" />
        </button>
      </div>
    </motion.li>
  )
})
