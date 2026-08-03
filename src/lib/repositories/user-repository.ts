/**
 * UserRepository — read+write composite (Sprint 19).
 */

import type { Member } from '@/lib/data'
import type { RepositoryResult } from '@/types/repository'

export type UserRole = 'admin' | 'editor' | 'viewer'

export type User = {
  id: string
  name: string
  email: string
  role: UserRole
  avatar: string
}

export type UserProfilePatch = Partial<Pick<User, 'name' | 'avatar'>>

export interface UserReadRepository {
  /** Returns the active session's user, or `ok(null)` when guest. */
  currentUser(): Promise<RepositoryResult<User | null>>
  updateProfile(patch: UserProfilePatch): Promise<RepositoryResult<User>>
  listMembers(): Promise<RepositoryResult<Member[]>>
}

export interface UserWriteRepository {
  /** Create a new member. Returns the resulting domain row. */
  createMember(input: {
    nameJa: string
    name: unknown
    role?: unknown
    avatar: string
  }): Promise<RepositoryResult<Member>>

  updateMember(
    id: string,
    patch: Partial<{ nameJa: string; name: unknown; role: unknown; avatar: string }>,
  ): Promise<RepositoryResult<Member>>

  deleteMember(id: string): Promise<RepositoryResult<void>>
}

export interface UserRepository extends UserReadRepository, UserWriteRepository {}
