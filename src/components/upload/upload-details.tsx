'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { motion } from 'framer-motion'
import { CalendarDays, ImageIcon, Tag as TagIcon, X } from 'lucide-react'
import { formatBytes } from '@/lib/upload-utils'
import type { UploadItem } from '@/types/upload'

type UploadDetailsProps = {
  item: UploadItem | null
  onClose: () => void
}

/**
 * Read-only preview drawer. Lazy — when no item is active the
 * component returns null so nothing mounts (no scroll lock, no
 * listeners, no backdrop).
 */
export function UploadDetails({ item, onClose }: UploadDetailsProps) {
  useEffect(() => {
    if (!item) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prev
      window.removeEventListener('keydown', onKey)
    }
  }, [item, onClose])

  if (!item) return null

  return (
    <div
      className="fixed inset-0 z-[90] flex justify-end"
      role="dialog"
      aria-modal="true"
      aria-label="Detail upload"
    >
      <button
        onClick={onClose}
        aria-label="Tutup detail"
        className="absolute inset-0 cursor-default bg-scrim/45 backdrop-blur-sm"
      />
      <motion.aside
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
        className="card-paper relative flex h-full w-full max-w-md flex-col overflow-y-auto border-l border-border/60 shadow-[0_18px_60px_rgba(0,0,0,0.18)]"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <button
          onClick={onClose}
          aria-label="Tutup detail"
          className="absolute right-3 top-3 z-10 grid size-9 place-items-center rounded-full bg-card/85 text-foreground-strong backdrop-blur-md transition hover:bg-card"
        >
          <X size={15} aria-hidden="true" />
        </button>

        <div className="relative aspect-[4/3] w-full overflow-hidden bg-[#17140f]">
          <Image
            src={item.previewUrl}
            alt={item.name}
            fill
            sizes="(max-width: 768px) 100vw, 28rem"
            className="object-cover"
            unoptimized
          />
        </div>

        <div className="space-y-5 p-5">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[.18em] text-subtle-foreground">
              Status · {item.status}
            </p>
            <h2 className="font-jp mt-2 break-all text-[17px] font-semibold leading-snug text-foreground-strong">
              {item.name}
            </h2>
          </div>

          <div className="space-y-2 rounded-2xl border border-border/60 bg-card/40 p-3 text-[12px]">
            <Row icon={<CalendarDays size={13} aria-hidden="true" />}>
              {new Date(item.lastModified).toLocaleString()}
            </Row>
            <Row icon={<ImageIcon size={13} aria-hidden="true" />}>
              {item.width && item.height ? `${item.width} × ${item.height}` : 'Dimensi belum tersedia'}
            </Row>
            <Row icon={<TagIcon size={13} aria-hidden="true" />}>
              {item.hash ? item.hash.slice(0, 18) + '…' : '—'}
            </Row>
            <Row icon={<span className="text-[10px] font-bold">B</span>}>{formatBytes(item.bytes)}</Row>
            <Row icon={<span className="text-[10px] font-bold">M</span>}>{item.type || '—'}</Row>
          </div>

          {item.error && (
            <p
              role="alert"
              className="rounded-2xl border border-foreground-strong/30 bg-foreground-strong/10 px-3 py-2 text-[11.5px] text-foreground-strong"
            >
              {item.error}
            </p>
          )}

          <Link
            href="/media"
            className="inline-flex min-h-11 w-full items-center justify-center rounded-full border border-border bg-card px-4 py-2.5 text-[12px] font-semibold text-foreground-strong transition hover:border-primary/40 hover:text-primary"
          >
            Buka Media Library
          </Link>
        </div>
      </motion.aside>
    </div>
  )
}

function Row({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 text-foreground-strong">
      <span className="grid size-5 place-items-center rounded-md bg-muted text-subtle-foreground">{icon}</span>
      <span className="min-w-0 truncate">{children}</span>
    </div>
  )
}
