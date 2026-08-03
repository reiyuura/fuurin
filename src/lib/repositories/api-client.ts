/**
 * ApiClient — transport boundary.
 *
 * Repositories depend on this interface, never on `fetch` or
 * `MockApiClient` directly. Sprint 14 adds `FetchApiClient` without
 * touching any repository code.
 */

import type { RepositoryError, RepositoryErrorCode } from '@/types/repository'
import type { ApiResponseMeta } from '@/types/api-config'

export type ApiRequest = {
  method: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE'
  /** Path under the API root. e.g. `/albums/hanami-2026`. */
  path: string
  query?: Record<string, string | number | boolean | undefined | null>
  body?: unknown
  signal?: AbortSignal
}

export type ApiSuccess<T> = { ok: true; data: T; meta: ApiResponseMeta }
export type ApiFailure = { ok: false; status: number; error: RepositoryError; meta: ApiResponseMeta }
export type ApiResponse<T> = ApiSuccess<T> | ApiFailure

export interface ApiClient {
  request<T>(req: ApiRequest): Promise<ApiResponse<T>>
}

/** Map HTTP-like status to a stable RepositoryErrorCode. */
export function codeFromStatus(status: number): RepositoryErrorCode {
  if (status === 401) return 'unauthorized'
  if (status === 403) return 'forbidden'
  if (status === 404) return 'not_found'
  if (status === 409) return 'conflict'
  if (status >= 400 && status < 500) return 'validation'
  if (status >= 500) return 'transport'
  return 'unknown'
}
