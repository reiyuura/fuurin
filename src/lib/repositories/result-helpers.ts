/**
 * Result helpers — pure utilities.
 *
 * No imports from `@/types` (avoids cycles). Consumers stay readable:
 *
 *   return ok(value)
 *   return err('not_found', 'Album not found')
 */

import type { RepositoryError, RepositoryErrorCode, RepositoryResult } from '@/types/repository'

export function ok<T>(value: T): RepositoryResult<T> {
  return { ok: true, value }
}

export function err<T>(
  code: RepositoryErrorCode,
  message: string,
  cause?: unknown,
): RepositoryResult<T> {
  const error: RepositoryError = cause !== undefined ? { code, message, cause } : { code, message }
  return { ok: false, error }
}

export function isOk<T>(r: RepositoryResult<T>): r is { ok: true; value: T } {
  return r.ok
}

export type { RepositoryResult, RepositoryError }
