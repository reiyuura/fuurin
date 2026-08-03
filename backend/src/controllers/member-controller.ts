/**
 * Member controller — GET /members.
 *
 * Wire format = frontend MemberDto `{ id, name, nameJa, role, avatar }`
 * (repository-dtos.ts). The domain `Member` carries `initial` instead of
 * `nameJa`; mock parity derives `nameJa` from `name.ja`.
 */

import type { FastifyReply, FastifyRequest } from 'fastify'
import type { MemberService } from '../services/member-service'
import type { Member } from '../domain/models'
import { unwrap } from './result-unwrap'

type MemberDto = {
  id: string
  name: Member['name']
  nameJa: string
  role: Member['role']
  avatar: string
}

function toDto(m: Member): MemberDto {
  const nameJa = typeof m.name === 'object' ? m.name.ja : m.name
  return { id: m.id, name: m.name, nameJa, role: m.role, avatar: m.avatar }
}

export function createMemberController(service: MemberService) {
  return {
    /** GET /members — bare array of MemberDto. */
    async list(_request: FastifyRequest, reply: FastifyReply) {
      const result = await service.list()
      const members = unwrap(result)
      return reply.send(members.map(toDto))
    },
  }
}