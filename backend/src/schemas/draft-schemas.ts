/**
 * Draft schemas — Zod validation for Sprint 23 draft API.
 */

import { z } from 'zod'

export const createDraftSchema = z.object({
  title: z.string().min(1).max(200),
  slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug hanya boleh huruf kecil, angka, dan tanda hubung.').min(1).max(100),
  description: z.string().max(2000).optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format tanggal: YYYY-MM-DD').optional(),
  cover: z.string().url().max(500).optional(),
})

export const updateDraftSchema = createDraftSchema.partial()

export const draftSlugParamSchema = z.object({ slug: z.string().min(1).max(100) })

export type CreateDraftInput = z.infer<typeof createDraftSchema>
export type UpdateDraftInput = z.infer<typeof updateDraftSchema>