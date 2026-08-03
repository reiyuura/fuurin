/**
 * Result type — mirrors the frontend `RepositoryResult<T>` contract
 * (`src/types/repository.ts`). Every backend service/repository returns
 * this shape so the HTTP layer can map to the error envelope without
 * exceptions.
 */

export type RepositoryErrorCode =
  | 'not_found'
  | 'unauthorized'
  | 'forbidden'
  | 'validation'
  | 'conflict'
  | 'transport'
  | 'unknown'

export type RepositoryError = {
  code: RepositoryErrorCode
  message: string
  cause?: unknown
}

export type Result<T> =
  | { ok: true; value: T }
  | { ok: false; error: RepositoryError }

export function ok<T>(value: T): Result<T> {
  return { ok: true, value }
}

export function err<T = never>(
  code: RepositoryErrorCode,
  message: string,
  cause?: unknown,
): Result<T> {
  return { ok: false, error: { code, message, cause } }
}
