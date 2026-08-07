/**
 * AuthRepository — Prisma-backed User/Session access.
 *
 * Sprint 20A: login, logout, refresh, currentUser.
 * Never returns Prisma types — maps to `SessionUser` domain shape.
 */

import type { PrismaClient } from '@prisma/client'
import type { SessionUser, UserRole } from '../domain/auth'
import { ok, type Result } from '../shared/result'

import { safe } from '../repositories/queries/prisma-error'

/** Internal marker — thrown inside rotateSession's transaction to force
 *  a rollback when the old refresh session is already gone (replay). */
class ReplayDetectedError extends Error {
  constructor() {
    super('refresh token replay detected')
    this.name = 'ReplayDetectedError'
  }
}

export class AuthRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findByEmail(email: string): Promise<Result<{ id: string; email: string; name: string; role: UserRole; avatar: string; passwordHash: string | null } | null>> {
    const row = await safe(async () =>
      this.prisma.user.findUnique({
        where: { email },
        select: { id: true, email: true, name: true, role: true, avatar: true, passwordHash: true },
      }),
    )
    if (!row.ok) return row
    if (!row.value) return ok(null)
    return ok({
      ...row.value,
      role: row.value.role as UserRole,
    })
  }

  async findById(id: string): Promise<Result<SessionUser | null>> {
    const row = await safe(async () =>
      this.prisma.user.findUnique({
        where: { id },
        select: { id: true, email: true, name: true, role: true, avatar: true },
      }),
    )
    if (!row.ok) return row
    if (!row.value) return ok(null)
    return ok(this.toSessionUser(row.value))
  }

  async createSession(args: { userId: string; tokenHash: string; expiresAt: Date }): Promise<Result<{ id: string }>> {
    const row = await safe(async () =>
      this.prisma.session.create({
        data: {
          userId: args.userId,
          tokenHash: args.tokenHash,
          expiresAt: args.expiresAt,
        },
        select: { id: true },
      }),
    )
    if (!row.ok) return row
    return ok(row.value)
  }

  async findSession(tokenHash: string): Promise<Result<{ id: string; userId: string; expiresAt: Date } | null>> {
    const row = await safe(async () =>
      this.prisma.session.findUnique({
        where: { tokenHash },
        select: { id: true, userId: true, expiresAt: true },
      }),
    )
    if (!row.ok) return row
    return ok(row.value ?? null)
  }

  async deleteSession(tokenHash: string): Promise<Result<void>> {
    const r = await safe(async () => this.prisma.session.delete({ where: { tokenHash } }))
    if (!r.ok) {
      // P2025 = row not found — idempotent delete.
      if (r.error.code === 'unknown' || r.error.code === 'transport') return ok(undefined)
    }
    return ok(undefined)
  }

  /**
   * Atomically replace the session identified by `oldTokenHash` with a
   * fresh one (refresh-token rotation).
   *
   * Returns:
   *  - ok(true)  — rotation performed
   *  - ok(false) — old session already gone: this exact token was
   *                replayed or rotated concurrently. Caller MUST reject.
   *  - err(...)  — database failure (transaction rolled back; the old
   *                session is left intact)
   */
  async rotateSession(args: {
    oldTokenHash: string
    userId: string
    newTokenHash: string
    expiresAt: Date
  }): Promise<Result<boolean>> {
    return safe(async () => {
      try {
        return await this.prisma.$transaction(async (tx) => {
          const deleted = await tx.session.deleteMany({
            where: { tokenHash: args.oldTokenHash },
          })
          if (deleted.count === 0) throw new ReplayDetectedError()
          await tx.session.create({
            data: {
              userId: args.userId,
              tokenHash: args.newTokenHash,
              expiresAt: args.expiresAt,
            },
          })
          return true
        })
      } catch (e) {
        if (e instanceof ReplayDetectedError) return false
        throw e
      }
    })
  }

  private toSessionUser(row: { id: string; email: string; name: string; role: string; avatar: string }): SessionUser {
    return {
      id: row.id,
      email: row.email,
      displayName: row.name,
      role: row.role as UserRole,
      avatar: row.avatar,
    }
  }
}