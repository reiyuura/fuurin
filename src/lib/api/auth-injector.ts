/**
 * auth-injector — turns a SessionAccessor into outgoing headers.
 *
 * The injector never sees AuthProvider; the SessionAccessor
 * abstraction (REQUIRED REFINEMENT #1) keeps FetchApiClient auth-agnostic.
 */

import type { SessionAccessor } from './session-accessor'

export const BEARER_HEADER = 'Authorization'

/**
 * Read the current session and return a header map. When guest,
 * returns the input untouched. When authenticated, adds the
 * `Authorization: Bearer <token>` header using the accessor's
 * `resolveToken` policy.
 */
export async function injectAuthHeaders(
  base: Record<string, string>,
  accessor: SessionAccessor,
): Promise<Record<string, string>> {
  try {
    const session = await accessor.getSession()
    if (!session) return base
    const token = accessor.resolveToken(session)
    if (!token) return base
    return {
      ...base,
      [BEARER_HEADER]: `Bearer ${token}`,
    }
  } catch {
    // If session lookup itself fails, send the request without auth —
    // the server's 401 will trigger the same UX as a guest request.
    return base
  }
}

/** Strip Authorization from a headers object — used by the logger. */
export function sanitizeHeaders(headers: Record<string, string>): Record<string, string> {
  const out: Record<string, string> = {}
  for (const [k, v] of Object.entries(headers)) {
    out[k] = k.toLowerCase() === BEARER_HEADER.toLowerCase() ? '[REDACTED]' : v
  }
  return out
}
