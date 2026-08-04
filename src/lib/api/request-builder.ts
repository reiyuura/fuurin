/**
 * request-builder — pure: ApiRequest + headers + signal → RequestInit.
 *
 * No fetcher, no timeout, no auth — those are composed by the
 * `FetchApiClient`. This module only produces the `RequestInit`
 * shape that `fetch()` consumes.
 */

import type { HttpMethod } from '@/types/api-config'

export type RequestInitInput = {
  method: HttpMethod
  body?: unknown
  headers: Record<string, string>
  signal: AbortSignal
  /** Optional pre-stringified body — used by retry loops to skip re-stringifying. */
  prebuiltBody?: string
}

export function buildRequestInit({
  method,
  body,
  headers,
  signal,
  prebuiltBody,
}: RequestInitInput): RequestInit {
  const init: RequestInit = {
    method,
    headers: { ...headers },
    signal,
    cache: 'no-store',
    // Sprint 25 fix: 'include' so the browser stores the HttpOnly refresh
    // cookie set by /auth/login. Without this, credentials:'omit' strips
    // Set-Cookie from the login response → session lost on next page load.
    credentials: 'include',
    redirect: 'follow',
  }

  // Body handling:
  //  - undefined / null → no body, no Content-Type
  //  - FormData / Blob → pass through, browser sets Content-Type
  //  - anything else → JSON.stringify + application/json
  if (body !== undefined && body !== null) {
    if (typeof body === 'string') {
      init.body = body
    } else if (
      typeof FormData !== 'undefined' && body instanceof FormData ||
      typeof Blob !== 'undefined' && body instanceof Blob ||
      typeof ArrayBuffer !== 'undefined' && body instanceof ArrayBuffer ||
      typeof URLSearchParams !== 'undefined' && body instanceof URLSearchParams
    ) {
      init.body = body as BodyInit
    } else {
      init.body = prebuiltBody ?? JSON.stringify(body)
      const hdrs = init.headers as Record<string, string> | undefined
      if (hdrs && !('Content-Type' in hdrs) && !('content-type' in hdrs)) {
        hdrs['Content-Type'] = 'application/json'
      }
    }
  }

  return init
}

/** Stringify once for retries that share the same body. */
export function prebuildBody(body: unknown): string | undefined {
  if (body === undefined || body === null) return undefined
  if (typeof body === 'string') return body
  if (
    typeof FormData !== 'undefined' && body instanceof FormData ||
    typeof Blob !== 'undefined' && body instanceof Blob ||
    typeof ArrayBuffer !== 'undefined' && body instanceof ArrayBuffer ||
    typeof URLSearchParams !== 'undefined' && body instanceof URLSearchParams
  ) {
    return undefined // pass-through; cannot pre-stringify
  }
  return JSON.stringify(body)
}
