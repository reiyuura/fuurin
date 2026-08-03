/**
 * Zod schemas for WRITE API — request body + path param validation.
 *
 * All payloads validated with Zod; every failure maps to 400 `validation`
 * via the global error handler. Enums mirror the Prisma schema.
 */

import { z } from 'zod'

/* ── Shared primitives ───────────────────────────────────────── */

/**
 * Partial L10n — a string (single locale) or any non-empty subset of
 * { ja, id, en }. The same shape works for both create and update;
 * strict "all 3 required" was over-eager and rejected legitimate
 * single-locale writes from the frontend.
 */
const l10nPartial = z.union([
  z.string().min(1).max(200),
  z.object({
    ja: z.string().min(1).max(200).optional(),
    id: z.string().min(1).max(200).optional(),
    en: z.string().min(1).max(200).optional(),
  }).refine((o) => Object.keys(o).length > 0, 'setidaknya satu field harus diisi'),
])

const l10n = l10nPartial

const slugSchema = z
  .string()
  .min(1)
  .max(100)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'slug harus lowercase alphanumeric dengan dash')

const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'tanggal harus YYYY-MM-DD')

const seasonSchema = z.enum(['spring', 'summer', 'autumn', 'winter'])
const categorySchema = z.enum(['school', 'festival', 'study', 'travel', 'graduation'])
const visibilitySchema = z.enum(['draft', 'published'])
const orientationSchema = z.enum(['landscape', 'portrait'])

/* ── Album ───────────────────────────────────────────────────── */

export const createAlbumSchema = z.object({
  slug: slugSchema,
  title: l10n,
  period: l10n.optional(),
  cover: z.string().url().min(1).max(500),
  date: dateSchema,
  season: seasonSchema,
  category: categorySchema,
  visibility: visibilitySchema.optional().default('published'),
  /**
   * Optional initial stats. Without auth, the album is owned by the
   * seeded admin (first user row) — see service.
   */
  count: z.number().int().min(0).optional(),
  views: z.number().int().min(0).optional(),
})

export type CreateAlbumInput = z.infer<typeof createAlbumSchema>

export const updateAlbumSchema = createAlbumSchema
  .omit({ slug: true })
  .partial()
  .extend({
    title: l10nPartial.optional(),
    period: l10nPartial.optional(),
  })

export type UpdateAlbumInput = z.infer<typeof updateAlbumSchema>

export const albumSlugParamSchema = z.object({
  slug: slugSchema,
})

/* ── Photo / Media ───────────────────────────────────────────── */

export const createMediaSchema = z.object({
  id: z.string().min(3).max(300).optional(), // "${albumSlug}:${idx}" — synthesized when absent
  albumSlug: slugSchema,
  idx: z.number().int().min(0),
  src: z.string().url().min(1).max(500),
  caption: l10n,
  ago: l10n.optional(),
  tags: z.array(z.string().min(1).max(50)).max(20).optional(),
  likes: z.number().int().min(0).optional(),
  orientation: orientationSchema,
  date: dateSchema,
})

export type CreateMediaInput = z.infer<typeof createMediaSchema>

export const updateMediaSchema = createMediaSchema
  .omit({ id: true, albumSlug: true, idx: true })
  .partial()
  .extend({
    caption: l10nPartial.optional(),
    ago: l10nPartial.optional(),
  })

export type UpdateMediaInput = z.infer<typeof updateMediaSchema>

export const mediaIdParamSchema = z.object({
  id: z.string().min(3).max(300),
})

/* ── Timeline ────────────────────────────────────────────────── */

export const createTimelineSchema = z.object({
  date: dateSchema,
  title: l10n,
  description: l10n,
  albumId: slugSchema.nullable().optional(),
  categoryTag: z.string().min(1).max(50).nullable().optional(),
  photo: z.string().min(1).max(500),
})

export type CreateTimelineInput = z.infer<typeof createTimelineSchema>

export const updateTimelineSchema = createTimelineSchema
  .partial()
  .extend({
    title: l10nPartial.optional(),
    description: l10nPartial.optional(),
  })

export type UpdateTimelineInput = z.infer<typeof updateTimelineSchema>

export const timelineIdParamSchema = z.object({
  id: z.string().min(1).max(100),
})

/* ── Member ──────────────────────────────────────────────────── */

export const createMemberSchema = z.object({
  nameJa: z.string().min(1).max(100),
  name: l10n,
  role: l10n.optional(),
  avatar: z.string().url().min(1).max(500),
})

export type CreateMemberInput = z.infer<typeof createMemberSchema>

export const updateMemberSchema = createMemberSchema
  .partial()
  .extend({
    name: l10nPartial.optional(),
    role: l10nPartial.optional(),
  })

export type UpdateMemberInput = z.infer<typeof updateMemberSchema>

export const memberIdParamSchema = z.object({
  id: z.string().min(1).max(100),
})