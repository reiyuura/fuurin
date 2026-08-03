/**
 * User Repository — interface (Domain only).
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

export interface UserRepository {
  /** Returns the active session's user, or `ok(null)` when guest. */
  currentUser(): Promise<RepositoryResult<User | null>>
  updateProfile(patch: UserProfilePatch): Promise<RepositoryResult<User>>
  listMembers(): Promise<RepositoryResult<Member[]>>
}
