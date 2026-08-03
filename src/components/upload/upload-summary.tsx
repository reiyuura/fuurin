'use client'

import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { Images, RotateCcw, Trash2 } from 'lucide-react'
import { computeTotals } from '@/lib/upload-utils'
import { UploadProgress } from '@/components/upload/upload-progress'
import type { UploadItem } from '@/types/upload'

type UploadSummaryProps = {
  items: UploadItem[]
  onClearFinished: () => void
  onReset: () => void
}

/** Global counters + overall progress + queue actions. UI-only. */
export function UploadSummary({ items, onClearFinished, onReset }: UploadSummaryProps) {
  const totals = computeTotals(items)
  const finished = totals.completed + totals.failed + totals.cancelled
  const hasFinished = finished > 0

  return (
    <section
      aria-label="Ringkasan upload"
      className="space-y-4 rounded-2xl border border-border/70 bg-card/80 p-4 shadow-paper sm:p-5"
    >
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[.18em] text-subtle-foreground">
            Overall Progress
          </p>
          <p className="mt-1 font-jp text-[28px] font-semibold leading-none text-foreground-strong">
            {totals.overallPercent}%
          </p>
          <p className="mt-1 text-[11.5px] text-muted-foreground" aria-live="polite">
            <span className="font-semibold text-foreground-strong">{totals.completed}</span> selesai ·{' '}
            <span className="font-semibold text-foreground-strong">{totals.total}</span> total
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <Link
            href="/media"
            className="inline-flex h-10 items-center gap-1.5 rounded-full border border-border bg-card px-3.5 text-[12px] font-semibold text-foreground-strong transition hover:border-primary/35 hover:text-primary"
          >
            <Images size={13} aria-hidden="true" />
            Lihat Media Library
          </Link>
          {hasFinished && (
            <button
              type="button"
              onClick={onClearFinished}
              className="inline-flex h-10 items-center gap-1.5 rounded-full border border-border bg-card px-3.5 text-[12px] font-semibold text-muted-foreground transition hover:border-primary/35 hover:text-foreground-strong"
            >
              <RotateCcw size={12} aria-hidden="true" />
              Bersihkan selesai
            </button>
          )}
          <button
            type="button"
            onClick={onReset}
            aria-label="Reset antrian upload"
            className="inline-flex h-10 items-center gap-1.5 rounded-full border border-border bg-card px-3.5 text-[12px] font-semibold text-muted-foreground transition hover:border-foreground-strong/40 hover:text-foreground-strong"
          >
            <Trash2 size={12} aria-hidden="true" />
            Reset semua
          </button>
        </div>
      </header>

      <div className="space-y-1">
        <div className="flex items-center justify-between text-[10.5px] uppercase tracking-[.14em] text-subtle-foreground">
          <span>Progress</span>
          <AnimatePresence mode="popLayout">
            <motion.span
              key={totals.overallPercent}
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 4 }}
              transition={{ duration: 0.18 }}
              className="font-bold text-foreground-strong"
            >
              {totals.overallPercent}%
            </motion.span>
          </AnimatePresence>
        </div>
        <UploadProgress value={totals.overallPercent} size="md" label="Overall upload progress" />
      </div>

      {/* Status counts */}
      <ul className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Stat label="Selesai" value={totals.completed} tone="accent" />
        <Stat label="Mengunggah" value={totals.uploading} tone="primary" />
        <Stat label="Gagal" value={totals.failed} tone="strong" />
        <Stat label="Menunggu" value={totals.queued} tone="muted" />
      </ul>
    </section>
  )
}

function Stat({ label, value, tone }: { label: string; value: number; tone: 'accent' | 'primary' | 'strong' | 'muted' }) {
  const toneStyles =
    tone === 'accent'
      ? 'text-accent-ink bg-accent-subtle'
      : tone === 'primary'
        ? 'text-primary-ink bg-primary-subtle'
        : tone === 'strong'
          ? 'text-foreground-strong bg-foreground-strong/10'
          : 'text-muted-foreground bg-muted'
  return (
    <li className={`flex flex-col gap-1 rounded-xl border border-border/60 px-3 py-2 ${toneStyles}`}>
      <span className="text-[10px] font-bold uppercase tracking-[.16em] opacity-80">{label}</span>
      <span className="font-jp text-[18px] font-semibold leading-none">{value}</span>
    </li>
  )
}
