'use client'

/**
 * useUploadWorker — Feature-layer hook that owns the upload queue,
 * timers, and per-file mock upload lifecycle.
 *
 * Browser APIs (URL.createObjectURL, setInterval, Image) are intentionally
 * confined to this file. Business utils stay pure; the worker handles
 * every side effect.
 */

import {
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
} from 'react'
import type { UploadItem, UploadOptions } from '@/types/upload'
import { UPLOAD_DEFAULTS } from '@/types/upload'
import { hashFile, readImageDimensions, uploadId } from '@/lib/upload-utils'

/* ── Mock upload (deterministic, abortable) ────────────────────── */

interface MockHandle {
  promise: Promise<void>
  cancel: () => void
}

function createMockUpload(opts: {
  totalMs: number
  tickMs: number
  onProgress: (pct: number) => void
  signal: { cancelled: boolean }
}): MockHandle {
  const start = Date.now()
  const timer = setInterval(() => {
    if (opts.signal.cancelled) return
    const elapsed = Date.now() - start
    const pct = Math.min(100, Math.round((elapsed / opts.totalMs) * 100))
    opts.onProgress(pct)
    if (pct >= 100) clearInterval(timer)
  }, opts.tickMs)

  const promise = new Promise<void>((resolve, reject) => {
    const check = setInterval(() => {
      if (opts.signal.cancelled) {
        clearInterval(check)
        reject(new Error('Upload dibatalkan'))
        return
      }
      const elapsed = Date.now() - start
      if (elapsed >= opts.totalMs) {
        clearInterval(check)
        opts.onProgress(100)
        resolve()
      }
    }, Math.min(100, opts.tickMs))
  })

  return {
    promise,
    cancel: () => {
      opts.signal.cancelled = true
      clearInterval(timer)
    },
  }
}

/* ── Reducer + state ───────────────────────────────────────────── */

interface State {
  items: UploadItem[]
}

type Action =
  | { type: 'add'; item: UploadItem }
  | { type: 'update'; id: string; patch: Partial<UploadItem> }
  | { type: 'remove'; id: string }
  | { type: 'clear_finished' }
  | { type: 'reset' }

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'add':
      return { items: [...state.items, action.item] }
    case 'update':
      return {
        items: state.items.map((it) => (it.id === action.id ? { ...it, ...action.patch } : it)),
      }
    case 'remove':
      return { items: state.items.filter((it) => it.id !== action.id) }
    case 'clear_finished':
      return {
        items: state.items.filter(
          (it) => it.status !== 'completed' && it.status !== 'failed' && it.status !== 'cancelled',
        ),
      }
    case 'reset':
      return { items: [] }
    default:
      return state
  }
}

/* ── Hook ──────────────────────────────────────────────────────── */

export function useUploadWorker(options: UploadOptions = {}) {
  const opts = useMemo(
    () => ({
      maxBytes: options.maxBytes ?? UPLOAD_DEFAULTS.maxBytes,
      acceptedTypes: options.acceptedTypes ?? UPLOAD_DEFAULTS.acceptedTypes,
      maxConcurrent: options.maxConcurrent ?? UPLOAD_DEFAULTS.maxConcurrent,
      mockSpeedMs: options.mockSpeedMs ?? UPLOAD_DEFAULTS.mockSpeedMs,
      progressTickMs: options.progressTickMs ?? UPLOAD_DEFAULTS.progressTickMs,
    }),
    [
      options.maxBytes,
      options.acceptedTypes,
      options.maxConcurrent,
      options.mockSpeedMs,
      options.progressTickMs,
    ],
  )

  const [state, dispatch] = useReducer(reducer, { items: [] })

  // Track active workers + per-item abort signals (RefMap — no re-renders).
  const activeHandles = useRef(new Map<string, { cancel: () => void; signal: { cancelled: boolean } }>())

  // Track every generated object URL independently from render state.
  // Add/remove flows own the set; unmount cleanup therefore sees the
  // latest URLs without reading or mutating a ref during render.
  const objectUrlsRef = useRef(new Set<string>())

  useEffect(() => {
    const objectUrls = objectUrlsRef.current
    return () => {
      for (const url of objectUrls) {
        try {
          URL.revokeObjectURL(url)
        } catch {
          /* ignore */
        }
      }
      objectUrls.clear()
    }
  }, [])

  /* ── Add files (called from dropzone / file picker) ─────── */

  const addFiles = useCallback(
    async (files: FileList | File[]) => {
      const list = Array.from(files)
      const existingIds = new Set(state.items.map((it) => it.id))

      // 1. Insert as 'validating' synchronously so the UI shows them immediately.
      const newItems: UploadItem[] = []
      for (const file of list) {
        const id = uploadId(file)
        if (existingIds.has(id)) continue
        const previewUrl = URL.createObjectURL(file)
        objectUrlsRef.current.add(previewUrl)
        newItems.push({
          id,
          name: file.name,
          type: file.type,
          bytes: file.size,
          lastModified: file.lastModified,
          status: 'validating',
          progress: 0,
          previewUrl,
        })
      }
      for (const item of newItems) dispatch({ type: 'add', item })

      // 2. For each validating item: read hash + dims, then move to 'ready'.
      await Promise.all(
        newItems.map(async (item) => {
          try {
            const file = list.find((f) => uploadId(f) === item.id)!
            const [hash, dims] = await Promise.all([
              hashFile(file),
              readImageDimensions(file).catch(() => undefined),
            ])
            dispatch({
              type: 'update',
              id: item.id,
              patch: {
                status: 'ready',
                hash,
                width: dims?.width,
                height: dims?.height,
              },
            })
          } catch (err) {
            dispatch({
              type: 'update',
              id: item.id,
              patch: {
                status: 'failed',
                error: err instanceof Error ? err.message : 'Gagal memvalidasi file',
                finishedAt: Date.now(),
              },
            })
          }
        }),
      )
    },
    [state.items],
  )

  /* ── Worker loop: promote ready → uploading while slot available ── */

  // Effects use state.items so they re-fire when status changes.
  useEffect(() => {
    const active = Array.from(activeHandles.current.keys())
    const available = opts.maxConcurrent - active.length
    if (available <= 0) return

    const ready = state.items.filter((it) => it.status === 'ready')
    if (ready.length === 0) return

    const toStart = ready.slice(0, available)
    for (const item of toStart) {
      dispatch({ type: 'update', id: item.id, patch: { status: 'uploading', progress: 0 } })

      const signal = { cancelled: false }
      const handle = createMockUpload({
        totalMs: opts.mockSpeedMs,
        tickMs: opts.progressTickMs,
        onProgress: (pct) => dispatch({ type: 'update', id: item.id, patch: { progress: pct } }),
        signal,
      })

      activeHandles.current.set(item.id, { cancel: handle.cancel, signal })

      handle.promise
        .then(() => {
          activeHandles.current.delete(item.id)
          dispatch({
            type: 'update',
            id: item.id,
            patch: { status: 'completed', progress: 100, finishedAt: Date.now() },
          })
        })
        .catch((err: Error) => {
          activeHandles.current.delete(item.id)
          const wasCancelled = signal.cancelled
          dispatch({
            type: 'update',
            id: item.id,
            patch: {
              status: wasCancelled ? 'cancelled' : 'failed',
              error: wasCancelled ? undefined : err.message,
              finishedAt: Date.now(),
            },
          })
        })
    }
    // Re-run whenever items mutate so additional uploads start as slots open.
  }, [state.items, opts.maxConcurrent, opts.mockSpeedMs, opts.progressTickMs])

  /* ── Public actions ──────────────────────────────────────── */

  const cancel = useCallback((id: string) => {
    const handle = activeHandles.current.get(id)
    if (handle) handle.cancel()
    else dispatch({ type: 'update', id, patch: { status: 'cancelled', finishedAt: Date.now() } })
  }, [])

  const retry = useCallback((id: string) => {
    dispatch({ type: 'update', id, patch: { status: 'ready', progress: 0, error: undefined } })
  }, [])

  const remove = useCallback((id: string) => {
    const handle = activeHandles.current.get(id)
    if (handle) handle.cancel()
    activeHandles.current.delete(id)
    const item = state.items.find((it) => it.id === id)
    if (item) {
      try {
        URL.revokeObjectURL(item.previewUrl)
        objectUrlsRef.current.delete(item.previewUrl)
      } catch {
        /* ignore */
      }
    }
    dispatch({ type: 'remove', id })
  }, [state.items])

  const clearFinished = useCallback(() => {
    // Revoke URLs for finished items first.
    const finished = state.items.filter(
      (it) => it.status === 'completed' || it.status === 'failed' || it.status === 'cancelled',
    )
    for (const it of finished) {
      try {
        URL.revokeObjectURL(it.previewUrl)
      } catch {
        /* ignore */
      }
    }
    dispatch({ type: 'clear_finished' })
  }, [state.items])

  const reset = useCallback(() => {
    // Cancel any in-flight uploads + revoke every URL.
    for (const [id, handle] of activeHandles.current) {
      handle.cancel()
      activeHandles.current.delete(id)
    }
    for (const it of state.items) {
      try {
        URL.revokeObjectURL(it.previewUrl)
      } catch {
        /* ignore */
      }
    }
    dispatch({ type: 'reset' })
  }, [state.items])

  return {
    items: state.items,
    addFiles,
    cancel,
    retry,
    remove,
    clearFinished,
    reset,
    options: opts,
  }
}

export type UploadWorker = ReturnType<typeof useUploadWorker>
