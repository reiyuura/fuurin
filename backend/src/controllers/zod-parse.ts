/**
 * Zod parse helper — converts a ZodError into an ApiError(validation)
 * so the global error handler emits the 400 `validation` envelope
 * instead of an unhandled 500.
 */

import { z } from 'zod'
import { ApiError } from '../shared/errors'

export function parseOrThrow<T>(schema: z.ZodType<T>, input: unknown, what = 'parameter'): T {
  const parsed = schema.safeParse(input)
  if (parsed.success) return parsed.data
  throw new ApiError('validation', `${what} tidak valid.`, parsed.error.issues.map((i) => i.message))
}