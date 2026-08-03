import type { UploadItem, UploadOptions, UploadValidation } from '@/types/upload'
import { UPLOAD_DEFAULTS } from '@/types/upload'

/* ── Stable identity ─────────────────────────────────────────────
   Same file → same id. Uses name + size + lastModified; falls back
   to a caller-provided hash (set by `hashFile()`) when available.
   Never uses `crypto.randomUUID()` — retry, dedupe, and debugging
   all rely on this id being reproducible. */

export function uploadId(file: File, hash?: string): string {
  if (hash) return hash
  return `upload:${file.name}:${file.size}:${file.lastModified}`
}

/* ── Format bytes ──────────────────────────────────────────────── */

export function formatBytes(n: number): string {
  if (!Number.isFinite(n) || n < 0) return '—'
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`
  if (n < 1024 * 1024 * 1024) return `${(n / (1024 * 1024)).toFixed(1)} MB`
  return `${(n / (1024 * 1024 * 1024)).toFixed(2)} GB`
}

/* ── File validation (pure — uses file metadata only) ─────────── */

export function validateFile(
  file: File,
  options: UploadOptions,
  existingHashes: ReadonlySet<string>,
): UploadValidation {
  const errors: UploadValidation['errors'] = []
  const maxBytes = options.maxBytes ?? UPLOAD_DEFAULTS.maxBytes
  const accepted = options.acceptedTypes ?? UPLOAD_DEFAULTS.acceptedTypes

  if (file.size > maxBytes) {
    errors.push({
      code: 'too_large',
      message: `${file.name} terlalu besar (${formatBytes(file.size)}, maks ${formatBytes(maxBytes)})`,
    })
  }
  if (!accepted.includes(file.type)) {
    errors.push({
      code: 'unsupported_type',
      message: `${file.name} — format ${file.type || 'tidak dikenal'} tidak didukung`,
    })
  }
  if (existingHashes.has(uploadId(file))) {
    errors.push({
      code: 'duplicate',
      message: `${file.name} sudah ada di antrian`,
    })
  }

  return { valid: errors.length === 0, errors }
}

/* ── Hash file (browser-bound but stateless) ──────────────────── */

const HASH_PREFIX = 'fuirin-upload'

/**
 * Reads the file in a single slice and produces a stable hex hash.
 * Uses FileReader (browser API) but does not mutate any app state —
 * the result is a plain string the caller can attach to an UploadItem.
 */
export async function hashFile(file: File): Promise<string> {
  const slice = file.slice(0, 64 * 1024)
  const buf = await slice.arrayBuffer()
  const view = new Uint8Array(buf)
  // FNV-1a 32-bit over the head slice — fast and stable.
  let h = 0x811c9dc5
  for (let i = 0; i < view.length; i++) {
    h ^= view[i]
    h = (h + ((h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24))) >>> 0
  }
  return `${HASH_PREFIX}:${h.toString(16).padStart(8, '0')}:${file.size}`
}

/* ── Read image dimensions (browser-bound but stateless) ──────── */

export function readImageDimensions(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      const w = img.naturalWidth
      const h = img.naturalHeight
      URL.revokeObjectURL(url)
      resolve({ width: w, height: h })
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Tidak dapat membaca dimensi gambar'))
    }
    img.src = url
  })
}

/* ── Sort items by status for display ─────────────────────────── */

const STATUS_ORDER: Record<UploadItem['status'], number> = {
  uploading: 0,
  validating: 1,
  ready: 2,
  failed: 3,
  cancelled: 4,
  queued: 5,
  completed: 6,
}

export function sortByStatus(items: UploadItem[]): UploadItem[] {
  return [...items].sort((a, b) => {
    const d = STATUS_ORDER[a.status] - STATUS_ORDER[b.status]
    if (d !== 0) return d
    return a.name.localeCompare(b.name)
  })
}

/* ── Group by status ──────────────────────────────────────────── */

export type UploadGroup = { status: UploadItem['status']; items: UploadItem[] }

export function groupByStatus(items: UploadItem[]): UploadGroup[] {
  const groups = new Map<UploadItem['status'], UploadItem[]>()
  for (const item of items) {
    if (!groups.has(item.status)) groups.set(item.status, [])
    groups.get(item.status)!.push(item)
  }
  // Preserve a stable display order.
  const order: UploadItem['status'][] = [
    'uploading',
    'validating',
    'ready',
    'failed',
    'cancelled',
    'queued',
    'completed',
  ]
  return order.flatMap((status) => {
    const bucket = groups.get(status)
    if (!bucket || bucket.length === 0) return []
    return [{ status, items: bucket }]
  })
}

/* ── Compute global progress summary ──────────────────────────── */

export interface UploadTotals {
  total: number
  queued: number
  uploading: number
  completed: number
  failed: number
  cancelled: number
  /** Average progress across `uploading` items (0 if none). */
  activeProgress: number
  /** Overall completion percentage (0–100), based on completed + failed + cancelled. */
  overallPercent: number
}

export function computeTotals(items: UploadItem[]): UploadTotals {
  let queued = 0
  let uploading = 0
  let completed = 0
  let failed = 0
  let cancelled = 0
  let progressSum = 0
  for (const item of items) {
    switch (item.status) {
      case 'queued':
      case 'validating':
      case 'ready':
        queued++
        break
      case 'uploading':
        uploading++
        progressSum += item.progress
        break
      case 'completed':
        completed++
        break
      case 'failed':
        failed++
        break
      case 'cancelled':
        cancelled++
        break
    }
  }
  const finished = completed + failed + cancelled
  const overallPercent = items.length === 0 ? 0 : Math.round((finished / items.length) * 100)
  const activeProgress = uploading === 0 ? 0 : Math.round(progressSum / uploading)
  return {
    total: items.length,
    queued,
    uploading,
    completed,
    failed,
    cancelled,
    activeProgress,
    overallPercent,
  }
}
