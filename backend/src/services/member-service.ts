/**
 * MemberService — read-side business logic for class members.
 *
 * Wire: GET /members → bare array of Member DTOs.
 */

import type { UserRepository } from '../repositories/user-repository'
import type { Result } from '../shared/result'
import type { Member } from '../domain/models'

export type MemberServiceDeps = {
  users: UserRepository
}

export function createMemberService(deps: MemberServiceDeps) {
  const { users } = deps

  return {
    /** GET /members — bare array. */
    async list(): Promise<Result<Member[]>> {
      return users.listMembers()
    },
  }
}

export type MemberService = ReturnType<typeof createMemberService>