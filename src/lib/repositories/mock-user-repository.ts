/**
 * MockUserRepository — reads/writes the active user via ApiClient.
 *
 * Profile mutations persist to the mock store (reset on server
 * restart, like every other mock store).
 */

import type { ApiClient } from './api-client'
import type { MemberDto, UserDto } from '@/types/repository-dtos'
import { toUser } from './dto-mappers'
import { err, ok } from './result-helpers'
import type { RepositoryResult } from './result-helpers'
import type { User, UserProfilePatch, UserRepository } from './user-repository'
import { authProvider } from '@/lib/auth/auth-provider'
import type { Member } from '@/lib/data'

export class MockUserRepository implements UserRepository {
  constructor(private readonly api: ApiClient) {}

  async currentUser(): Promise<RepositoryResult<User | null>> {
    const session = await authProvider.getSession()
    if (!session) return ok(null)
    const res = await this.api.request<UserDto>({ method: 'GET', path: '/users/me' })
    if (!res.ok) return err<User | null>(res.error.code, res.error.message)
    return ok(toUser(res.data))
  }

  async updateProfile(patch: UserProfilePatch): Promise<RepositoryResult<User>> {
    const res = await this.api.request<UserDto>({
      method: 'PATCH',
      path: '/users/me',
      body: patch,
    })
    if (!res.ok) return err<User>(res.error.code, res.error.message)
    return ok(toUser(res.data))
  }

  async listMembers(): Promise<RepositoryResult<Member[]>> {
    const res = await this.api.request<MemberDto[]>({ method: 'GET', path: '/members' })
    if (!res.ok) return err<Member[]>(res.error.code, res.error.message)
    // The mock store has only the seeded Member domain shape; map rows
    // directly so we don't lose the `initial` field which the live
    // domain type requires.
    return ok(
      res.data.map((dto) => ({
        id: dto.id,
        name: { ja: dto.name.ja, id: dto.name.id, en: dto.name.en },
        role: typeof dto.role === 'string'
          ? { ja: dto.role, id: dto.role, en: dto.role }
          : { ja: dto.role.ja, id: dto.role.id, en: dto.role.en },
        initial: dto.nameJa.charAt(0),
        avatar: dto.avatar,
      })),
    )
  }
}
