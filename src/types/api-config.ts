/**
 * API configuration — shared types.
 *
 * Read by `lib/api/fetch-api-client.ts` and constructed at runtime
 * from environment variables by `lib/repositories/api-client-provider`.
 * No URL is ever hardcoded — every consumer receives the resolved
 * config at construction time.
 */

export type HttpMethod = 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE'

export type ApiMode = 'mock' | 'fetch'

export type ApiConfig = {
  /** Which ApiClient implementation to use. */
  mode: ApiMode
  /** Base URL of the backend (no trailing slash). */
  baseUrl: string
  /** Optional API version segment, prefixed with `/`. e.g. `/v1`. */
  version: string
  /** Per-request timeout in milliseconds. */
  timeoutMs: number
  /** Retry config — only GET requests are retried. */
  retry: {
    max: number
    /** Backoff in ms per attempt. Length must be >= max. */
    backoffMs: readonly number[]
  }
  /** Default headers attached to every request. */
  defaultHeaders: Record<string, string>
}

export type ApiResponseMeta = {
  status: number
  headers: Record<string, string>
  durationMs: number
  /** Request correlation id — emitted by the client, mirrored in logs. */
  requestId: string
}
