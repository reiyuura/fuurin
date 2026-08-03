/**
 * FetchMemberRepository — reads members from the Sprint 18 Read API.
 *
 * Wire parity with the backend:
 *   GET /members → MemberDto[]
 *
 * `currentUser()` keeps the existing session-backed contract; when the
 * backend has no /users/me route yet it degrades to `ok(null)` (guest)
 * instead of surfacing a transport error.
 */

import type { ApiClient } from './api-client'
import type { MemberDto, UserDto } from '@/types/repository-dtos'
import { toMember, toUser } from './dto-mappers'
import { err, ok } from './result-helpers'
import type { RepositoryResult } from './result-helpers'
import type { User, UserProfilePatch, UserRepository } from './user-repository'
import { authProvider } from '@/lib/auth/auth-provider'
import type { Member } from '@/lib/data'

export class FetchMemberRepository implements UserRepository {
  constructor(private readonly api: ApiClient) {}

  async currentUser(): Promise<RepositoryResult<User | null>> {
    const session = await authProvider.getSession()
    if (!session) return ok(null)
    const res = await this.api.request<UserDto>({ method: 'GET', path: '/users/me' })
    if (res.ok) return ok(toUser(res.data))
    // No /users/me route in Sprint 18 → treat as guest, not an error.
    if (res.status === 401 || res.status === 404) return ok(null)
    return err<User | null>(res.error.code, res.error.message)
  }

  async updateProfile(_patch: UserProfilePatch): Promise<RepositoryResult<User>> {
    return err<User>('transport', 'updateProfile belum tersedia — write API hadir di sprint berikutnya.')
  }

  async listMembers(): Promise<RepositoryResult<Member[]>> {
    const res = await this.api.request<MemberDto[]>({ method: 'GET', path: '/members' })
    if (!res.ok) return err<Member[]>(res.error.code, res.error.message)
    return ok(res.data.map(toMember))
  }
}