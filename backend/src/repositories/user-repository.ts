/**
 * UserRepository — interface (domain only). Prisma-free.
 *
 * Mirrors the frontend `UserRepository` (`src/lib/repositories/user-repository.ts`).
 */

import type { Result } from '../shared/result'
import type { Member, User, UserProfilePatch } from '../domain/models'

export interface UserRepository {
  currentUser(): Promise<Result<User | null>>
  updateProfile(patch: UserProfilePatch): Promise<Result<User>>
  listMembers(): Promise<Result<Member[]>>
}