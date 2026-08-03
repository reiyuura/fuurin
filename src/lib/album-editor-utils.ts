/**
 * Album Editor — pure business utils.
 *
 * No React, no repo import, no mock data, no random. Every function
 * takes everything it needs as a parameter and returns a fresh value.
 */

import type { MediaItem } from '@/types/media'
import type { AlbumDraft } from '@/types/album-editor'

/* ── Slugify ──────────────────────────────────────────────────── */

/** Latinize + lowercase + dash-join. Keeps CJK as-is. */
export function slugifyBase(title: string): string {
  return title
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '') // strip diacritics
    .toLowerCase()
    .replace(/[^a-z0-9\u3040-\u30ff\u4e00-\u9fff]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
}

/**
 * Collision-aware slug.
 *   slugify('album', ['album'])        → 'album-2'
 *   slugify('album', ['album', 'album-2']) → 'album-3'
 *   slugify('album', ['album', 'album-2', 'album-3']) → 'album-4'
 *
 * When `exclude` is provided, that slug is ignored for collision
 * (used when editing — the album keeps its own slug).
 */
export function slugify(title: string, existing: readonly string[], exclude?: string): string {
  const base = slugifyBase(title) || 'album'
  const set = new Set(existing.filter((s) => s !== exclude))
  if (!set.has(base)) return base
  for (let i = 2; i < 10_000; i++) {
    const candidate = `${base}-${i}`
    if (!set.has(candidate)) return candidate
  }
  return `${base}-${Date.now()}`
}

/* ── Reorder / remove ─────────────────────────────────────────── */

export function moveItem<T>(list: readonly T[], from: number, to: number): T[] {
  if (from === to || from < 0 || to < 0 || from >= list.length || to >= list.length) {
    return [...list]
  }
  const next = [...list]
  const [item] = next.splice(from, 1)
  next.splice(to, 0, item)
  return next
}

export function removeId(list: readonly string[], id: string): string[] {
  return list.filter((x) => x !== id)
}

export function toggleId(list: readonly string[], id: string): string[] {
  return list.includes(id) ? removeId(list, id) : [...list, id]
}

/* ── Validation ───────────────────────────────────────────────── */

export type AlbumValidation = {
  valid: boolean
  errors: Partial<Record<keyof AlbumDraft, string>>
}

/** Synchronous, field-level. Title and date are the only hard rules. */
export function validateDraft(draft: AlbumDraft): AlbumValidation {
  const errors: AlbumValidation['errors'] = {}
  if (!draft.title.trim()) errors.title = 'Title wajib diisi'
  else if (draft.title.trim().length > 80) errors.title = 'Title maksimal 80 karakter'
  if (!draft.date || !/^\d{4}-\d{2}-\d{2}$/.test(draft.date)) errors.date = 'Format tanggal tidak valid'
  if (draft.description.length > 400) errors.description = 'Deskripsi maksimal 400 karakter'
  return { valid: Object.keys(errors).length === 0, errors }
}

/** Publishability: valid + ≥1 photo. */
export function canPublish(draft: AlbumDraft): boolean {
  const v = validateDraft(draft)
  return v.valid && draft.photoIds.length > 0
}

/* ── Dirty check ──────────────────────────────────────────────── */

function sameOrder(a: readonly string[], b: readonly string[]): boolean {
  if (a.length !== b.length) return false
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false
  return true
}

/**
 * Field-by-field equality. Order matters for `photoIds` and
 * `coverMediaId` (selection identity).
 */
export function isEditorDirty(draft: AlbumDraft, saved: AlbumDraft): boolean {
  if (draft.slug !== saved.slug) return true
  if (draft.title !== saved.title) return true
  if (draft.description !== saved.description) return true
  if (draft.date !== saved.date) return true
  if (draft.location !== saved.location) return true
  if (draft.visibility !== saved.visibility) return true
  if ((draft.coverMediaId ?? '') !== (saved.coverMediaId ?? '')) return true
  if (!sameOrder(draft.photoIds, saved.photoIds)) return true
  return false
}

/* ── Presentation helpers ─────────────────────────────────────── */

export type ResolvedPhotoIds = {
  byId: Map<string, MediaItem>
  ordered: MediaItem[]
  missing: string[]
}

/** Resolve a draft's photoIds against the flat media pool. */
export function resolvePhotoIds(draft: AlbumDraft, media: readonly MediaItem[]): ResolvedPhotoIds {
  const byId = new Map(media.map((m) => [m.id, m]))
  const ordered: MediaItem[] = []
  const missing: string[] = []
  for (const id of draft.photoIds) {
    const item = byId.get(id)
    if (item) ordered.push(item)
    else missing.push(id)
  }
  return { byId, ordered, missing }
}

/** Resolve cover — falls back to first ordered photo, else null. */
export function resolveCover(draft: AlbumDraft, media: readonly MediaItem[]): MediaItem | null {
  if (draft.coverMediaId) {
    const m = media.find((x) => x.id === draft.coverMediaId)
    if (m) return m
  }
  const { ordered } = resolvePhotoIds(draft, media)
  return ordered[0] ?? null
}

/**
 * Collision-aware slug helper that pulls the live slug list from a
 * repository abstraction. Pure in the sense that the slug algorithm
 * is deterministic; the live list is passed in.
 */
export function uniqueSlug(
  title: string,
  existingSlugs: readonly string[],
  exclude?: string,
): string {
  return slugify(title, existingSlugs, exclude)
}
