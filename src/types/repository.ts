/**
 * Repository shared types — Result, Error, Query.
 *
 * Single source of truth for every repository contract in the app.
 * DTOs intentionally live in `@/types/repository-dtos` and never
 * leak past the repository layer (see REQUIRED REFINEMENT #3).
 */

/* ── Result ─────────────────────────────────────────────────── */

export type RepositoryErrorCode =
  | 'not_found'
  | 'unauthorized'
  | 'forbidden'
  | 'validation'
  | 'conflict'
  | 'transport'
  | 'unknown'

export type RepositoryError = {
  code: RepositoryErrorCode
  message: string
  cause?: unknown
}

export type RepositoryResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: RepositoryError }

/* ── Query ──────────────────────────────────────────────────── */

export type Pagination = {
  /** Zero-based page index. */
  page: number
  /** Items per page. */
  size: number
}

export type SortSpec = {
  key: string
  direction: 'asc' | 'desc'
}

export type FilterSpec = {
  /** Field → value. Wildcards/multi-value are implementation-defined. */
  [field: string]: string | number | boolean | undefined | null
}

export type SearchSpec = {
  /** Free-text query. */
  query: string
  /** Fields the query should match against. */
  fields?: readonly string[]
}

/**
 * Structured query envelope. Layered so each axis can evolve
 * independently (see OPTIONAL REFINEMENT).
 */
export type QueryOptions = {
  pagination?: Pagination
  sort?: SortSpec | SortSpec[]
  filter?: FilterSpec
  search?: SearchSpec
}

export type PageResult<T> = {
  items: T[]
  total: number
  page: number
  size: number
}
