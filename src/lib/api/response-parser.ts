/**
 * response-parser — HTTP Response → ApiResponse<T>.
 *
 * Per REQUIRED REFINEMENT #2 the parser handles three shapes
 * explicitly:
 *
 *   1. JSON body (Content-Type: application/json or application/*+json)
 *      → parse once, map status, return typed payload.
 *   2. Empty body (204 No Content, or 200 with empty body)
 *      → success with `undefined` (or whatever the caller expects).
 *   3. Non-JSON body (text/plain, octet-stream, etc.)
 *      → if status is 2xx: try JSON first, else return undefined.
 *      → if status is non-2xx: include the raw text in error.message
 *         so callers can surface server-supplied error messages.
 *
 * Repository code never touches `Response` / `Headers` / `JSON.parse`
 * directly — it consumes the `ApiResponse<T>` shape produced here.
 */

import type { ApiResponse } from '../repositories/api-client'
import type { ApiResponseMeta } from '@/types/api-config'
import { mapHttpError } from './error-mapper'

const JSON_RE = /^\s*(application\/(json|[\w.+-]*\+json))/i

export async function parseResponse<T>(
  res: Response,
  meta: ApiResponseMeta,
): Promise<ApiResponse<T>> {
  const status = res.status
  const contentType = res.headers.get('content-type') ?? ''

  // Decide body handling upfront.
  if (status === 204) {
    return { ok: true, data: undefined as T, ...metaFields(meta) }
  }

  // Empty body — only legitimate on success.
  const text = await res.text()
  if (text.length === 0) {
    if (status >= 200 && status < 300) {
      return { ok: true, data: undefined as T, ...metaFields(meta) }
    }
    return { ok: false, status, ...metaFields(meta), error: mapHttpError(status) }
  }

  // Non-empty body. Try JSON when content-type says so OR when the
  // body looks like JSON (some servers forget to set the header).
  if (JSON_RE.test(contentType) || looksLikeJson(text)) {
    try {
      const parsed = JSON.parse(text) as T
      if (status >= 200 && status < 300) return { ok: true, data: parsed, ...metaFields(meta) }
      // JSON error body — pick `message` field when present.
      const serverMessage =
        (parsed && typeof parsed === 'object' && 'message' in parsed
          ? String((parsed as { message?: unknown }).message ?? '')
          : '') || text
      return {
        ok: false,
        status,
        ...metaFields(meta),
        error: mapHttpError(status, serverMessage.slice(0, 500)),
      }
    } catch {
      // Body claimed JSON but wasn't — treat as unknown.
      return {
        ok: false,
        status,
        ...metaFields(meta),
        error: mapHttpError(status, text.slice(0, 500)),
      }
    }
  }

  // Non-JSON body.
  if (status >= 200 && status < 300) {
    // Best-effort: pass through as the typed value. Most callers
    // using non-JSON responses expect string / Blob — typed as T.
    return { ok: true, data: text as unknown as T, ...metaFields(meta) }
  }
  return {
    ok: false,
    status,
    ...metaFields(meta),
    error: mapHttpError(status, text.slice(0, 500)),
  }
}

function looksLikeJson(text: string): boolean {
  const s = text.trimStart()
  return s.startsWith('{') || s.startsWith('[')
}

function metaFields(meta: ApiResponseMeta): { meta: ApiResponseMeta } {
  return { meta }
}
