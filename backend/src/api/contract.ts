/**
 * API request/response contract — mirrors the frontend `ApiClient`
 * interface (`src/lib/repositories/api-client.ts`) + `ApiConfig`
 * (`src/types/api-config.ts`). These types document the wire contract
 * the backend must honor; they are not depended on by Prisma or services.
 */

export type HttpMethod = 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE'

export type ApiRequest = {
  method: HttpMethod
  /** Path under the API root. e.g. `/albums/hanami-2026`. */
  path: string
  query?: Record<string, string | number | boolean | undefined | null>
  body?: unknown
  signal?: AbortSignal
}

export type ApiResponseMeta = {
  status: number
  headers: Record<string, string>
  durationMs: number
  requestId: string
}

export type ApiSuccess<T> = { ok: true; data: T; meta: ApiResponseMeta }
export type ApiFailure = { ok: false; status: number; error: { code: string; message: string }; meta: ApiResponseMeta }
export type ApiResponse<T> = ApiSuccess<T> | ApiFailure

export interface ApiClient {
  request<T>(req: ApiRequest): Promise<ApiResponse<T>>
}

export function codeFromStatus(status: number): string {
  if (status === 401) return 'unauthorized'
  if (status === 403) return 'forbidden'
  if (status === 404) return 'not_found'
  if (status === 409) return 'conflict'
  if (status >= 400 && status < 500) return 'validation'
  if (status >= 500) return 'transport'
  return 'unknown'
}