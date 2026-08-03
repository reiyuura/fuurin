/**
 * Result helpers — pure utilities.
 *
 * No imports from `@/types` (avoids cycles). Consumers stay readable:
 *
 *   return ok(value)
 *   return err('not_found', 'Album not found')
 *   match(result, { ok: (v) => ..., err: (e) => ... })
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

export function isErr<T>(r: RepositoryResult<T>): r is { ok: false; error: RepositoryError } {
  return !r.ok
}

export function map<T, U>(
  r: RepositoryResult<T>,
  fn: (v: T) => U,
): RepositoryResult<U> {
  return r.ok ? ok(fn(r.value)) : r
}

export function flatMap<T, U>(
  r: RepositoryResult<T>,
  fn: (v: T) => RepositoryResult<U>,
): RepositoryResult<U> {
  return r.ok ? fn(r.value) : r
}

export function unwrap<T>(r: RepositoryResult<T>): T {
  if (r.ok) return r.value
  throw new Error(`Repository unwrap failed: ${r.error.code} — ${r.error.message}`)
}

export function unwrapOr<T>(r: RepositoryResult<T>, fallback: T): T {
  return r.ok ? r.value : fallback
}

export type MatchHandlers<T, R> = {
  ok: (value: T) => R
  err: (error: RepositoryError) => R
}

/** Pattern-matching helper — collapses `if (r.ok) ... else ...`. */
export function match<T, R>(r: RepositoryResult<T>, handlers: MatchHandlers<T, R>): R {
  return r.ok ? handlers.ok(r.value) : handlers.err(r.error)
}

export type { RepositoryResult, RepositoryError }
