/**
 * Upload Zod schema — file metadata validation.
 */

import { z } from 'zod'

export const uploadFileSchema = z.object({
  mimetype: z.string().min(1).max(100),
  filename: z.string().min(1).max(255),
  // file buffer is handled by the multipart plugin separately.
})

export type UploadFileMeta = z.infer<typeof uploadFileSchema>