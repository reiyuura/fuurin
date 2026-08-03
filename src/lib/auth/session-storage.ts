/**
 * Session storage — defensive localStorage IO.
 *
 * Every read returns null when called server-side or when the payload
 * is malformed. Writes swallow quota errors so the auth flow never
 * crashes because of storage limits.
 */

import type { Session } from '@/types/auth'

const STORAGE_KEY = 'fuurin-auth-session'

function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'
}

export function readSession(): Session | null {
  if (!isBrowser()) return null
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Session
    // Defensive shape check — anything missing is treated as no session.
    if (
      !parsed ||
      typeof parsed !== 'object' ||
      typeof parsed.issuedAt !== 'string' ||
      typeof parsed.expiresAt !== 'string' ||
      !parsed.user ||
      typeof parsed.user.email !== 'string'
    ) {
      return null
    }
    // Auto-expire on read.
    if (Date.parse(parsed.expiresAt) <= Date.now()) {
      window.localStorage.removeItem(STORAGE_KEY)
      return null
    }
    return parsed
  } catch {
    return null
  }
}

export function writeSession(session: Session): void {
  if (!isBrowser()) return
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(session))
  } catch {
    // ignore quota/private mode failures
  }
}

export function clearSession(): void {
  if (!isBrowser()) return
  try {
    window.localStorage.removeItem(STORAGE_KEY)
  } catch {
    // ignore
  }
}

export const SESSION_STORAGE_KEY = STORAGE_KEY
