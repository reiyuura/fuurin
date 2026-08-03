/**
 * SessionAccessor — minimal abstraction over session lookup.
 *
 * Per REQUIRED REFINEMENT #1 the FetchApiClient MUST NOT import the
 * AuthProvider directly. This interface is the only auth surface the
 * client knows about. The default implementation reads from
 * `authProvider.getSession()`, but tests or alternate auth systems
 * (NextAuth, Clerk, Auth.js) can swap it without touching the client.
 */

import type { Session } from '@/types/auth'

export type TokenResolver = (session: Session) => string | null

export interface SessionAccessor {
  /** Returns the current session, or null when guest. */
  getSession(): Promise<Session | null>
  /** Resolve a session into a bearer token (or null for guest/anon). */
  resolveToken: TokenResolver
}

/** Default token resolver — uses `session.token` when present. */
export const defaultTokenResolver: TokenResolver = (session) => session.token ?? null
