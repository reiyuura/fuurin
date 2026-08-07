/**
 * Result unwrap helper — converts a service `Result<T>` into T,
 * throwing the mapped ApiError on failure. Keeps controllers thin.
 */

import type { Result } from '../shared/result'
import { ApiError } from '../shared/errors'

export function unwrap<T>(result: Result<T>): T {
  if (result.ok) return result.value
  // NEVER forward raw `cause` into the response details — repositories
  // put raw Prisma errors there, whose serialized code/meta/clientVersion
  // leak schema internals and the Prisma version. Attach it as the
  // Error's `cause` instead: the error handler logs it server-side and
  // the client only receives the clean { message, code } envelope.
  throw new ApiError(result.error.code, result.error.message, undefined, {
    cause: result.error.cause,
  })
}