/**
 * Album Editor — shared types.
 *
 * The single source of truth for editor state, repository contract,
 * and visibility status. Components and features MUST NOT recompose
 * these locally — all mutations go through `AlbumRepository`.
 */

export type AlbumVisibility = 'draft' | 'published'

/** Editor shape. Mutated only via `use-album-editor` + repository. */
export type AlbumDraft = {
  /** Stable id — slug. Immutable after create. */
  slug: string
  title: string
  description: string
  /** ISO date — `YYYY-MM-DD`. */
  date: string
  location: string
  visibility: AlbumVisibility
  /** Reference to MediaItem.id — null when no cover chosen yet. */
  coverMediaId: string | null
  /** Ordered list of MediaItem.id — album photo sequence. */
  photoIds: string[]
  /** Server-assigned timestamp — informational only. */
  updatedAt: number
}

/** Snapshot used to detect dirty state. */
export type AlbumEditorState = {
  draft: AlbumDraft
  saved: AlbumDraft
  dirty: boolean
}

/** Read-only summary — what `getAll()` returns. */
export type AlbumSummary = {
  slug: string
  title: string
  date: string
  visibility: AlbumVisibility
  photoCount: number
  coverMediaId: string | null
  updatedAt: number
}

/**
 * Repository contract. UI/Feature never construct an implementation —
 * they receive it through the singleton provider in
 * `@/lib/repositories/album-repository`.
 *
 * All returned objects are deep clones (no mutable references into
 * internal storage). Implementations MUST clone before returning.
 */
export interface AlbumRepository {
  list(): AlbumSummary[]
  getBySlug(slug: string): AlbumDraft | null
  create(input: Omit<AlbumDraft, 'updatedAt'>): AlbumDraft
  update(slug: string, patch: Partial<Omit<AlbumDraft, 'slug' | 'updatedAt'>>): AlbumDraft
  delete(slug: string): void
  publish(slug: string): AlbumDraft
  /** For slugify collision detection — full slug list. */
  existingSlugs(): string[]
}
