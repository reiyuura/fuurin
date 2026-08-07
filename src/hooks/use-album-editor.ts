'use client'

/**
 * use-album-editor — feature hook.
 *
 * Owns draft state, dirty tracking, optimistic mutations, and the
 * `aria-live` save status string. All persistence calls go through
 * the injected `AlbumRepository` — no direct mock imports.
 */

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  canPublish as canPublishUtil,
  isEditorDirty,
  moveItem,
  removeId,
  uniqueSlug,
} from '@/lib/album-editor-utils'
import { repositories } from '@/lib/repositories/repository-registry'
import { isOk } from '@/lib/repositories/result-helpers'
import type {
  AlbumDraft,
  AlbumVisibility,
} from '@/types/album-editor'

export type SaveStatus =
  | { kind: 'idle' }
  | { kind: 'saving' }
  | { kind: 'saved'; at: number }
  | { kind: 'error'; message: string }

export type UseAlbumEditorArgs = {
  /** Initial snapshot from server (or empty for /new). */
  initial: AlbumDraft
  /** True when editing existing; false on /new. Controls slug behavior. */
  isNew: boolean
}

export type UseAlbumEditor = {
  draft: AlbumDraft
  saved: AlbumDraft
  dirty: boolean
  status: SaveStatus
  errors: Record<string, string>

  setTitle: (v: string) => void
  setDescription: (v: string) => void
  setDate: (v: string) => void
  setLocation: (v: string) => void
  setVisibility: (v: AlbumVisibility) => void
  setCover: (mediaId: string | null) => void
  addPhotos: (ids: string[]) => void
  removePhoto: (id: string) => void
  reorderPhotos: (from: number, to: number) => void
  reorderPhotosById: (id: string, toIndex: number) => void

  saveDraft: () => Promise<AlbumDraft>
  publish: () => Promise<AlbumDraft>
  deleteAlbum: () => Promise<void>

  canPublish: boolean
  photoCount: number
}

function snapshot(d: AlbumDraft): AlbumDraft {
  return {
    slug: d.slug,
    title: d.title,
    description: d.description,
    date: d.date,
    location: d.location,
    visibility: d.visibility,
    coverMediaId: d.coverMediaId,
    photoIds: [...d.photoIds],
    updatedAt: d.updatedAt,
  }
}

export function useAlbumEditor({ initial, isNew }: UseAlbumEditorArgs): UseAlbumEditor {
  const initialSaved = useMemo(() => snapshot(initial), [initial])
  const [draft, setDraft] = useState<AlbumDraft>(() => snapshot(initial))
  const [saved, setSaved] = useState<AlbumDraft>(() => initialSaved)
  const [status, setStatus] = useState<SaveStatus>({ kind: 'idle' })

  // Slug is set on save (not exposed in the form), so no touched flag.

  const dirty = isEditorDirty(draft, saved)
  const errors = useMemo(() => {
    const e: Record<string, string> = {}
    if (!draft.title.trim()) e.title = 'Title wajib diisi'
    else if (draft.title.trim().length > 80) e.title = 'Title maksimal 80 karakter'
    if (!/^\d{4}-\d{2}-\d{2}$/.test(draft.date)) e.date = 'Format tanggal tidak valid'
    if (draft.description.length > 400) e.description = 'Deskripsi maksimal 400 karakter'
    return e
  }, [draft.title, draft.date, draft.description])

  const canPublish = canPublishUtil(draft) && Object.keys(errors).length === 0
  const photoCount = draft.photoIds.length

  /* ── Field setters — optimistic, no repo call yet ───────────── */

  const setTitle = useCallback((v: string) => {
    setDraft((d) => ({ ...d, title: v.slice(0, 80) }))
  }, [])
  const setDescription = useCallback((v: string) => {
    setDraft((d) => ({ ...d, description: v.slice(0, 400) }))
  }, [])
  const setDate = useCallback((v: string) => {
    setDraft((d) => ({ ...d, date: v }))
  }, [])
  const setLocation = useCallback((v: string) => {
    setDraft((d) => ({ ...d, location: v.slice(0, 80) }))
  }, [])
  const setVisibility = useCallback((v: AlbumVisibility) => {
    setDraft((d) => ({ ...d, visibility: v }))
  }, [])
  const setCover = useCallback((id: string | null) => {
    setDraft((d) => ({ ...d, coverMediaId: id }))
  }, [])
  const addPhotos = useCallback((ids: string[]) => {
    setDraft((d) => {
      const seen = new Set(d.photoIds)
      const merged = [...d.photoIds]
      for (const id of ids) if (!seen.has(id)) merged.push(id)
      return { ...d, photoIds: merged }
    })
  }, [])
  const removePhoto = useCallback((id: string) => {
    setDraft((d) => {
      const next = removeId(d.photoIds, id)
      const cover = d.coverMediaId === id ? null : d.coverMediaId
      return { ...d, photoIds: next, coverMediaId: cover }
    })
  }, [])
  const reorderPhotos = useCallback((from: number, to: number) => {
    setDraft((d) => ({ ...d, photoIds: moveItem(d.photoIds, from, to) }))
  }, [])
  const reorderPhotosById = useCallback((id: string, toIndex: number) => {
    setDraft((d) => {
      const from = d.photoIds.indexOf(id)
      if (from < 0) return d
      return { ...d, photoIds: moveItem(d.photoIds, from, toIndex) }
    })
  }, [])

  /* ── Persistence ────────────────────────────────────────────── */

  const persist = useCallback(
    async (next: AlbumDraft, intent: 'draft' | 'publish'): Promise<AlbumDraft> => {
      setStatus({ kind: 'saving' })
      try {
        const visibility: AlbumVisibility = intent === 'publish' ? 'published' : 'draft'
        let result: AlbumDraft
        if (isNew) {
          const slugsRes = await repositories.albums.existingSlugs()
          const slugs = slugsRes.ok ? slugsRes.value : []
          const slug = uniqueSlug(next.title || 'album', slugs)
          const res = await repositories.albums.createDraft({
            ...next,
            slug,
            visibility,
          })
          if (!res.ok) throw new Error(res.error.message)
          result = res.value
        } else {
          const res = await repositories.albums.updateDraft(next.slug, {
            title: next.title,
            description: next.description,
            date: next.date,
            location: next.location,
            visibility,
            coverMediaId: next.coverMediaId,
            photoIds: next.photoIds,
          })
          if (!res.ok) throw new Error(res.error.message)
          result = res.value
        }
        setSaved(snapshot(result))
        setDraft(snapshot(result))
        setStatus({ kind: 'saved', at: Date.now() })
        return result
      } catch (e) {
        const message = e instanceof Error ? e.message : 'Gagal menyimpan'
        setStatus({ kind: 'error', message })
        throw e
      }
    },
    [isNew],
  )

  const saveDraft = useCallback(async () => {
    return persist({ ...draft, visibility: 'draft' }, 'draft')
  }, [draft, persist])

  const publish = useCallback(async () => {
    if (!canPublish) {
      throw new Error('Lengkapi title, tanggal, dan tambahkan minimal 1 foto')
    }
    return persist({ ...draft, visibility: 'published' }, 'publish')
  }, [draft, persist, canPublish])

  const deleteAlbum = useCallback(async () => {
    if (isNew) return
    const res = await repositories.albums.deleteDraft(draft.slug)
    if (!isOk(res)) {
      // Soft-fail — let the editor remain in a recoverable state.
      // (intentionally silent; the unsaved-guard keeps the draft dirty)
    }
  }, [draft.slug, isNew])

  // Auto-idle the save status after a beat — keeps aria-live tidy.
  useEffect(() => {
    if (status.kind !== 'saved') return
    const t = setTimeout(() => setStatus({ kind: 'idle' }), 2_500)
    return () => clearTimeout(t)
  }, [status])

  return {
    draft,
    saved,
    dirty,
    status,
    errors,
    setTitle,
    setDescription,
    setDate,
    setLocation,
    setVisibility,
    setCover,
    addPhotos,
    removePhoto,
    reorderPhotos,
    reorderPhotosById,
    saveDraft,
    publish,
    deleteAlbum,
    canPublish,
    photoCount,
  }
}
