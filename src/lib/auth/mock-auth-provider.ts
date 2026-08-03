/**
 * MockAuthProvider — deterministic in-memory + localStorage implementation.
 *
 * Seeded with one admin and one editor. Passwords are kept here for
 * Sprint 12 only — Sprint 13 replaces this with a real provider
 * (NextAuth/Clerk/Auth.js) without changing the contract.
 *
 * Subscribers receive the new session (or null) on every change.
 * Plus `storage` events so a login in another tab synchronizes state.
 */

import { Roles, type AuthProvider, type LoginInput, type Session, type User } from '@/types/auth'
import {
  clearSession,
  readSession,
  writeSession,
} from './session-storage'

const SESSION_TTL_MS = 8 * 60 * 60 * 1000 // 8 hours

/** Seeded mock users. NOT secure — replace before production. */
const SEED_USERS: Array<User & { password: string }> = [
  {
    id: 'u-rei',
    name: 'Rei',
    email: 'rei@fuurin.id',
    role: Roles.Admin,
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=160&q=85',
    password: 'rei12345',
  },
  {
    id: 'u-hana',
    name: 'Hana',
    email: 'hana@fuurin.id',
    role: Roles.Editor,
    avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=160&q=85',
    password: 'hana12345',
  },
]

function issueSession(user: User): Session {
  const issued = Date.now()
  return {
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      avatar: user.avatar,
    },
    issuedAt: new Date(issued).toISOString(),
    expiresAt: new Date(issued + SESSION_TTL_MS).toISOString(),
    // Deterministic dev token — Sprint 14 only. Real backend issues
    // a real JWT here.
    token: `mock.${user.id}.${issued}`,
  }
}

export class MockAuthProvider implements AuthProvider {
  private readonly listeners = new Set<(session: Session | null) => void>()
  private current: Session | null = null

  constructor() {
    this.current = readSession()
  }

  async getSession(): Promise<Session | null> {
    if (this.current && Date.parse(this.current.expiresAt) <= Date.now()) {
      this.clear()
    }
    return this.current
  }

  async login(input: LoginInput): Promise<Session> {
    // Tiny delay so the UI has a chance to show its "logging in" state.
    await new Promise((r) => setTimeout(r, 220))

    const match = SEED_USERS.find(
      (u) => u.email.trim().toLowerCase() === input.email.trim().toLowerCase(),
    )
    if (!match || match.password !== input.password) {
      const err = new Error('Email atau kata sandi tidak valid') as Error & { code?: string }
      err.code = 'invalid_credentials'
      throw err
    }
    const session = issueSession(match)
    this.current = session
    writeSession(session)
    this.notify(session)
    return session
  }

  async logout(): Promise<void> {
    this.clear()
  }

  subscribe(listener: (session: Session | null) => void): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  /** Test helper — Sprint 13 will replace. */
  getSeedCredentials(): Array<{ email: string; password: string; role: string }> {
    return SEED_USERS.map((u) => ({ email: u.email, password: u.password, role: u.role }))
  }

  private clear(): void {
    this.current = null
    clearSession()
    this.notify(null)
  }

  private notify(session: Session | null): void {
    for (const l of this.listeners) l(session)
  }
}
