/**
 * Zod schemas for READ API — query, params validation.
 *
 * Wire format follows the locked frontend contract (mock-api-client):
 * lists are bare arrays; detail is a bare object; missing → 404
 * `{ message, code: 'not_found' }`.
 */

import { z } from 'zod'
import type { QueryOptions } from '../shared/paging'
import { parseQueryParams } from '../shared/paging'

/* ── Shared query param schema ─────────────────────────────── */

const direction = z.enum(['asc', 'desc'])

/** `key:dir` or comma-joined `a:asc,b:desc` — matches toQueryParams. */
export const sortSpecSchema = z
  .string()
  .min(1)
  .max(200)
  .refine(
    (raw) =>
      raw
        .split(',')
        .every((token) => /^[a-zA-Z0-9_-]+:(asc|desc)$/.test(token.trim())),
    { message: 'sort must be "key:dir" tokens joined by commas' },
  )

export const pageSchema = z.coerce.number().int().min(0).max(10_000).default(0)
export const limitSchema = z.coerce.number().int().min(1).max(200).default(20)
export const qSchema = z.string().trim().min(1).max(200)

/** Free-text search fields — optional comma list (ja,id,en…). */
export const fieldsSchema = z
  .string()
  .trim()
  .max(200)
  .transform((raw) =>
    raw
      .split(',')
      .map((f) => f.trim())
      .filter(Boolean),
  )

/**
 * Coerced filter value: a bare query-string value can be a string,
 * number or "true"/"false". Unknown keys are NOT rejected here — the
 * repository's `buildWhere` whitelist rejects unsafe columns.
 */
export const filterValueSchema = z.union([z.string(), z.number(), z.boolean()])

/* ── Path params ───────────────────────────────────────────── */

export const slugParamSchema = z.object({
  slug: z.string().min(1).max(100),
})

export const mediaIdParamSchema = z.object({
  id: z.string().min(3).max(300),
})

/** Photo index inside an album — `${albumSlug}:${idx}` media-id parity. */
export const photoIdxParamSchema = z.object({
  slug: z.string().min(1).max(100),
  idx: z.coerce
    .string()
    .min(1)
    .max(12)
    .regex(/^\d+$/, 'idx must be a non-negative integer'),
})

/* ── Query object → URLSearchParams adapter ────────────────── */

/**
 * Zod-parsed query object (unknown keys preserved) → QueryOptions.
 * Reuses the locked Sprint 17 `parseQueryParams` helper; page/limit
 * defaults mirror the frontend pagination defaults.
 */
export function buildQueryOptions(
  query: Record<string, unknown>,
  defaults: { page?: number; limit?: number } = {},
): QueryOptions {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null || value === '') continue
    params.set(key, String(value))
  }
  if (defaults.page !== undefined && !params.has('page')) params.set('page', String(defaults.page))
  if (defaults.limit !== undefined && !params.has('limit')) params.set('limit', String(defaults.limit))
  return parseQueryParams(params)
}