/**
 * Authentication & Authorization — shared types.
 *
 * The single source of truth for `User`, `Role`, `Permission`, and the
 * `AuthProvider` contract. Components, hooks, and pages MUST import
 * from here — never inline literal strings for roles/permissions.
 */

/* ── Roles ──────────────────────────────────────────────────── */

export const Roles = {
  Admin: 'admin',
  Editor: 'editor',
  Viewer: 'viewer',
} as const

export type Role = (typeof Roles)[keyof typeof Roles]

/* ── Permissions ────────────────────────────────────────────── */

/**
 * Single source of truth for every permission string used in the app.
 * Adding a new permission: extend this object only — every helper,
 * guard, and check should reference `Permissions.X` instead of a
 * raw literal.
 */
export const Permissions = {
  AlbumCreate: 'album.create',
  AlbumEdit: 'album.edit',
  AlbumDelete: 'album.delete',
  AlbumPublish: 'album.publish',
  MediaUpload: 'media.upload',
  MediaDelete: 'media.delete',
} as const

export type Permission = (typeof Permissions)[keyof typeof Permissions]

/* ── User & Session ─────────────────────────────────────────── */

export type User = {
  id: string
  name: string
  email: string
  role: Role
  avatar: string
}

export type Session = {
  user: User
  /** ISO string — issued at. */
  issuedAt: string
  /** ISO string — expires at. */
  expiresAt: string
  /** Optional bearer token. The auth provider populates this when
   *  the backend issues one (e.g. JWT). Mock providers can synthesize
   *  a deterministic dev token. */
  token?: string
}

/* ── Auth state ─────────────────────────────────────────────── */

export type AuthState =
  | { status: 'loading' }
  | { status: 'authenticated'; session: Session }
  | { status: 'guest' }
  | { status: 'guest'; reason?: 'unauthorized' }

/* ── Provider contract ──────────────────────────────────────── */

export type LoginInput = { email: string; password: string }
export type LoginError = { code: 'invalid_credentials' | 'expired' | 'unknown'; message: string }

export interface AuthProvider {
  /** Returns the current session, or null when no user is signed in. */
  getSession(): Promise<Session | null>
  /** Validates credentials and returns a fresh session on success. */
  login(input: LoginInput): Promise<Session>
  /** Clears the active session. */
  logout(): Promise<void>
  /** Subscribe to auth state changes. Returns an unsubscribe function. */
  subscribe(listener: (session: Session | null) => void): () => void
}
