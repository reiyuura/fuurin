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
 * `Authorization: Bearer *** header using the accessor's
 * `resolveToken` policy.
 *
 * Sprint 25 fix: in fetch mode, the in-memory access token is set
 * via `setAccessToken()` — the mock `authProvider.getSession()`
 * returns null, so the old code skipped `resolveToken` entirely.
 * We now call `resolveToken` with a synthetic session (or null)
 * and check for a token regardless of whether `getSession()` found
 * a mock session.
 */
export async function injectAuthHeaders(
  base: Record<string, string>,
  accessor: SessionAccessor,
): Promise<Record<string, string>> {
  try {
    const session = await accessor.getSession()
    // Try resolveToken even when session is null — in fetch mode,
    // resolveToken reads from the in-memory token store, not session.
    const token = accessor.resolveToken(session as never)
    if (!token) return base
    return {
      ...base,
      [BEARER_HEADER]: `Bearer ${token}`,
    }
  } catch {
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
