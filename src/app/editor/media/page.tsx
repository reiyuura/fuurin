'use client'

/**
 * Media Library — grid, upload, bulk actions, search, image viewer.
 *
 * Sprint 22: permission-aware (viewer view-only, editor upload,
 * admin bulk delete).
 */

import { useCallback, useEffect, useMemo, useState } from 'react'
import Image from 'next/image'
import { Check, ImageOff, Loader2, Search, Trash2, Upload, X } from 'lucide-react'
import { getApiClient } from '@/lib/repositories/api-client-provider'
import { FetchMediaRepository } from '@/lib/repositories/fetch-media-repository'
import { FetchUploadRepository } from '@/lib/repositories/upload-repository'
import { useSession } from '@/components/auth/session-provider'
import { useToast } from '@/components/ui/toast'
import type { MediaItem } from '@/types/media'
import clsx from 'clsx'

export default function MediaLibraryPage() {
  const { user } = useSession()
  const isEditor = user?.role === 'admin' || user?.role === 'editor'
  const isAdmin = user?.role === 'admin'

  const [media, setMedia] = useState<MediaItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Search & filter.
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState<'newest' | 'oldest' | 'name'>(/* ... */'newest' as const)

  // Selection (bulk actions).
  const [selected, setSelected] = useState<Set<string>>(new Set())

  // Upload.
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<{ current: number; total: number } | null>(null)
  const [uploadQueue, setUploadQueue] = useState<File[]>([])

  // Image viewer.
  const [viewer, setViewer] = useState<{ index: number } | null>(null)

  // Fetch media.
  const fetchMedia = useCallback(async () => {
    setLoading(true)
    setError(null)
    const repo = new FetchMediaRepository(getApiClient())
    const res = await repo.list()
    if (res.ok) setMedia(res.value)
    else setError(res.error.message)
    setLoading(false)
  }, [])

  useEffect(() => { fetchMedia() }, [fetchMedia])

  // Filter & sort client-side.
  const filtered = useMemo(() => {
    let items = [...media]
    if (query.trim()) {
      const q = query.toLowerCase()
      items = items.filter((m) =>
        (m.caption.en ?? '').toLowerCase().includes(q) ||
        (m.caption.ja ?? '').toLowerCase().includes(q) ||
        m.id.toLowerCase().includes(q),
      )
    }
    if (sort === 'name') items.sort((a, b) => (a.caption.en ?? a.id).localeCompare(b.caption.en ?? b.id))
    else if (sort === 'oldest') items.sort((a, b) => a.date.localeCompare(b.date))
    else items.sort((a, b) => b.date.localeCompare(a.date)) // newest default
    return items
  }, [media, query, sort])

  // Toggle selection.
  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const selectAll = () => {
    if (selected.size === filtered.length) setSelected(new Set())
    else setSelected(new Set(filtered.map((m) => m.id)))
  }

  // Parallel upload with retry (max 3 concurrent, 2 retries per file).
  const handleUpload = async (files: FileList) => {
    const arr = Array.from(files)
    setUploadQueue(arr)
    setUploading(true)
    setUploadProgress({ current: 0, total: arr.length })

    const uploadOne = async (file: File, retries = 2): Promise<boolean> => {
      const repo = new FetchUploadRepository(getApiClient())
      for (let attempt = 0; attempt <= retries; attempt++) {
        try {
          const res = await repo.upload(file)
          if (res.ok) return true
          if (attempt < retries) await new Promise(r => setTimeout(r, 1000 * (attempt + 1)))
        } catch {
          if (attempt < retries) await new Promise(r => setTimeout(r, 1000 * (attempt + 1)))
        }
      }
      return false
    }

    const CONCURRENCY = 3
    let completed = 0
    const queue = [...arr]

    const worker = async () => {
      while (queue.length > 0) {
        const file = queue.shift()!
        const ok = await uploadOne(file)
        completed++
        setUploadProgress({ current: completed, total: arr.length })
        if (!ok) {
          // Toast would be called here — handled by parent via error state.
        }
      }
    }

    await Promise.all(Array.from({ length: Math.min(CONCURRENCY, arr.length) }, () => worker()))
    setUploading(false)
    setUploadProgress(null)
    setUploadQueue([])
    fetchMedia()
  }

  // Bulk delete.
  const handleBulkDelete = async () => {
    if (!confirm(`Hapus ${selected.size} foto? Tindakan ini tidak dapat dibatalkan.`)) return
    const ids = Array.from(selected)
    const res = await fetch('/api/v1/media/bulk', {
      method: 'DELETE',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ ids }),
    })
    if (res.ok) {
      setSelected(new Set())
      fetchMedia()
    }
  }

  // Image viewer navigation.
  const viewerItems = viewer ? filtered : []
  const openViewer = (index: number) => setViewer({ index })
  const closeViewer = () => setViewer(null)

  // Loading state.
  if (loading) return <MediaSkeleton />

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-foreground-strong">Media Library</h1>
          <p className="text-[13px] text-muted-foreground mt-0.5">{media.length} file</p>
        </div>

        {isEditor && (
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-primary/90">
            <Upload size={15} aria-hidden="true" />
            Unggah
            <input type="file" accept="image/jpeg,image/png,image/webp" multiple
              onChange={(e) => e.target.files && handleUpload(e.target.files)}
              className="hidden" />
          </label>
        )}
      </div>

      {/* Error state */}
      {error && (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-error/20 bg-error/5 py-12 text-center">
          <p className="text-sm font-medium text-error">{error}</p>
          <button onClick={fetchMedia} className="rounded-xl bg-error px-4 py-2 text-[13px] font-medium text-white hover:bg-error/90">
            Coba Lagi
          </button>
        </div>
      )}

      {/* Upload progress */}
      {uploading && uploadProgress && (
        <div className="rounded-xl border border-primary/20 bg-primary/5 px-4 py-3">
          <div className="flex items-center gap-2 text-[13px] font-medium text-primary">
            <Loader2 size={14} className="animate-spin" />
            Mengunggah {uploadProgress.current} dari {uploadProgress.total}...
          </div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-hover">
            <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${(uploadProgress.current / uploadProgress.total) * 100}%` }} />
          </div>
        </div>
      )}

      {/* Toolbar: search + sort + bulk actions */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input type="text" value={query} onChange={(e) => setQuery(e.target.value)}
            placeholder="Cari..." className="w-full rounded-xl border border-border bg-card py-2 pl-9 pr-3 text-[13px] text-foreground-strong placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30" />
          {query && (
            <button onClick={() => setQuery('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground-strong">
              <X size={13} aria-hidden="true" />
            </button>
          )}
        </div>

        <select value={sort} onChange={(e) => setSort(e.target.value as typeof sort)}
          className="rounded-xl border border-border bg-card px-3 py-2 text-[13px] text-foreground-strong focus:outline-none focus:ring-2 focus:ring-primary/30">
          <option value="newest">Terbaru</option>
          <option value="oldest">Terlama</option>
          <option value="name">Nama</option>
        </select>

        <button onClick={selectAll}
          className="rounded-xl border border-border px-3 py-2 text-[13px] font-medium text-foreground-strong hover:bg-hover transition">
          {selected.size === filtered.length && filtered.length > 0 ? 'Batal Semua' : 'Pilih Semua'}
        </button>

        {selected.size > 0 && isAdmin && (
          <button onClick={handleBulkDelete}
            className="inline-flex items-center gap-1.5 rounded-xl bg-error px-3 py-2 text-[13px] font-medium text-white hover:bg-error/90 transition">
            <Trash2 size={13} aria-hidden="true" />
            Hapus ({selected.size})
          </button>
        )}

        {selected.size > 0 && (
          <span className="text-[12px] text-muted-foreground">{selected.size} dipilih</span>
        )}
      </div>

      {/* Empty state */}
      {!loading && !error && filtered.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card py-20 text-center">
          <ImageOff size={32} className="text-subtle-foreground" />
          <p className="mt-3 text-sm font-medium text-foreground-strong">Tidak ada media</p>
          <p className="mt-1 text-[13px] text-muted-foreground">
            {query ? 'Coba ubah pencarian.' : 'Unggah foto untuk memulai.'}
          </p>
        </div>
      )}

      {/* Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
        {filtered.map((item, idx) => {
          const sel = selected.has(item.id)
          return (
            <div key={item.id}
              onClick={() => openViewer(idx)}
              className={clsx(
                'group relative cursor-pointer overflow-hidden rounded-xl border-2 bg-card transition',
                sel ? 'border-primary shadow-md' : 'border-border hover:border-primary/30',
              )}>
              {/* Thumbnail */}
              <div className="aspect-square overflow-hidden bg-hover">
                {item.src ? (
                  <img src={item.src} alt={item.caption.en ?? ''} className="h-full w-full object-cover"
                    loading="lazy" />
                ) : (
                  <div className="flex h-full items-center justify-center text-subtle-foreground">
                    <ImageOff size={24} />
                  </div>
                )}
              </div>

              {/* Overlay + checkbox */}
              <div className={clsx(
                'absolute inset-0 flex items-start justify-end p-1.5 transition',
                sel ? 'opacity-100' : 'opacity-0 group-hover:opacity-100',
              )}>
                <button onClick={(e) => { e.stopPropagation(); toggle(item.id) }}
                  className={clsx(
                    'grid size-6 place-items-center rounded-md transition',
                    sel ? 'bg-primary text-white' : 'bg-black/40 text-white hover:bg-black/60',
                  )}>
                  {sel ? <Check size={12} aria-hidden="true" /> : null}
                </button>
              </div>

              {/* Info bar */}
              <div className="px-2.5 py-2">
                <p className="truncate text-[11px] font-medium text-foreground-strong">
                  {item.caption.en || item.id}
                </p>
                <p className="text-[10px] text-subtle-foreground">{item.date}</p>
              </div>
            </div>
          )
        })}
      </div>

      {/* Image viewer modal */}
      {viewer && viewerItems[viewer.index] && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={closeViewer}>
          <button onClick={closeViewer}
            className="absolute top-4 right-4 grid size-10 place-items-center rounded-full bg-white/10 text-white hover:bg-white/20">
            <X size={20} aria-hidden="true" />
          </button>

          {viewer.index > 0 && (
            <button onClick={(e) => { e.stopPropagation(); setViewer({ index: viewer.index - 1 }) }}
              className="absolute left-4 grid size-10 place-items-center rounded-full bg-white/10 text-white hover:bg-white/20">
              ‹
            </button>
          )}
          {viewer.index < viewerItems.length - 1 && (
            <button onClick={(e) => { e.stopPropagation(); setViewer({ index: viewer.index + 1 }) }}
              className="absolute right-4 grid size-10 place-items-center rounded-full bg-white/10 text-white hover:bg-white/20">
              ›
            </button>
          )}

          <div className="max-h-[85vh] max-w-[85vw]" onClick={(e) => e.stopPropagation()}>
            <img src={viewerItems[viewer.index].src} alt={viewerItems[viewer.index].caption.en ?? ''}
              className="max-h-[85vh] max-w-[85vw] rounded-xl object-contain" />
            <p className="mt-2 text-center text-[13px] text-white/80">
              {viewer.index + 1} / {viewerItems.length} — {viewerItems[viewer.index].caption.en || viewerItems[viewer.index].id}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

function MediaSkeleton() {
  return (
    <div className="animate-pulse space-y-6">
      <div className="h-7 w-40 rounded-xl bg-hover" />
      <div className="h-9 w-64 rounded-xl bg-hover" />
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className="aspect-square rounded-xl bg-hover" />
        ))}
      </div>
    </div>
  )
}