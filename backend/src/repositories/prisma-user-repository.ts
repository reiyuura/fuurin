/**
 * PrismaUserRepository — Prisma-backed implementation of `UserRepository`.
 *
 * Sprint 17 ships the read side. Auth-bound behavior (who is "me"?) lands
 * in Sprint 20 — for now, `currentUser()` returns the seeded admin.
 */

import type { PrismaClient } from '@prisma/client'
import type { UserRepository } from './user-repository'
import type { Result } from '../shared/result'
import { err, ok } from '../shared/result'
import type { Member, User, UserProfilePatch } from '../domain/models'
import { toMember, toUser } from './mappers/prisma-to-domain'
import { buildOrderBy } from './queries/sort'
import { safe, safeFind } from './queries/prisma-error'

const SEEDED_ADMIN_EMAIL = 'rei@fuurin.id'

export class PrismaUserRepository implements UserRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async currentUser(): Promise<Result<User | null>> {
    // Sprint 17: return the seeded admin as the "current user" stand-in.
    // Sprint 20 will swap this for the real authenticated session lookup.
    const row = await safeFind(async () =>
      this.prisma.user.findUnique({ where: { email: SEEDED_ADMIN_EMAIL } }),
    )
    if (!row.ok) return row
    return ok(row.value ? toUser(row.value) : null)
  }

  async updateProfile(patch: UserProfilePatch): Promise<Result<User>> {
    const row = await safe(async () =>
      this.prisma.user.update({
        where: { email: SEEDED_ADMIN_EMAIL },
        data: {
          ...(patch.name !== undefined ? { name: patch.name } : {}),
          ...(patch.avatar !== undefined ? { avatar: patch.avatar } : {}),
        },
      }),
    )
    if (!row.ok) {
      // P2025 — admin row missing is a configuration error, not_found is fine here.
      if (row.error.code === 'not_found') {
        return err('not_found', 'Pengguna saat ini tidak ditemukan.')
      }
      return row
    }
    return ok(toUser(row.value))
  }

  async listMembers(): Promise<Result<Member[]>> {
    const rows = await safe(async () =>
      this.prisma.member.findMany({ orderBy: buildOrderBy('member') }),
    )
    if (!rows.ok) return rows
    return ok(rows.value.map(toMember))
  }
}