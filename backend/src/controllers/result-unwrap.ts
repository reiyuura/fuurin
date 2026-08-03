/**
 * Result unwrap helper — converts a service `Result<T>` into T,
 * throwing the mapped ApiError on failure. Keeps controllers thin.
 */

import type { Result } from '../shared/result'
import { ApiError } from '../shared/errors'

export function unwrap<T>(result: Result<T>): T {
  if (result.ok) return result.value
  const details = result.error.cause !== undefined ? { cause: result.error.cause } : undefined
  throw new ApiError(result.error.code, result.error.message, details)
}