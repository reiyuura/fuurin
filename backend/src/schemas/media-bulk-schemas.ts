/**
 * Media bulk operations — Sprint 22.
 *
 * DELETE /media/bulk — admin only, deletes multiple photos by id.
 * PATCH /media/reorder — reorder photos within an album.
 */

import { z } from 'zod'

export const bulkDeleteMediaSchema = z.object({
  ids: z.array(z.string().min(1).max(100)).min(1).max(100),
})

export const reorderMediaSchema = z.object({
  albumSlug: z.string().min(1).max(100),
  orderedIds: z.array(z.string().min(1).max(100)).min(1).max(500),
})

export type BulkDeleteMediaInput = z.infer<typeof bulkDeleteMediaSchema>
export type ReorderMediaInput = z.infer<typeof reorderMediaSchema>