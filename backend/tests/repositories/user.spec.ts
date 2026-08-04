/**
 * UserRepository tests — PrismaUserRepository against the real test DB.
 * Covers currentUser(), updateProfile(), listMembers().
 */

import { afterAll, beforeEach, describe, expect, it } from 'vitest'
import type { PrismaClient } from '@prisma/client'
import { PrismaUserRepository } from '../../src/repositories/prisma-user-repository'
import { truncateAll, getTestPrisma, disconnectTestPrisma } from '../helpers/setup-db'

let prisma: PrismaClient
let repo: PrismaUserRepository

beforeEach(async () => {
  prisma = await getTestPrisma()
  await truncateAll(prisma)
  repo = new PrismaUserRepository(prisma)
})

afterAll(async () => {
  await disconnectTestPrisma()
})

describe('UserRepository.currentUser', () => {
  it('returns null when no seeded admin exists', async () => {
    const r = await repo.currentUser()
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.value).toBeNull()
  })

  it('returns the seeded admin mapped to domain shape', async () => {
    // seedOwner uses a different email; currentUser looks up the seeded
    // admin email. Insert it directly.
    await prisma.user.create({
      data: {
        email: 'rei@fuurin.id',
        name: 'Rei',
        role: 'admin',
        avatar: 'https://example.com/avatar.jpg',
      },
    })
    const r = await repo.currentUser()
    expect(r.ok).toBe(true)
    if (r.ok && r.value) {
      expect(r.value.email).toBe('rei@fuurin.id')
      expect(r.value.role).toBe('admin')
    }
  })
})

describe('UserRepository.updateProfile', () => {
  it('returns not_found when the admin row is missing', async () => {
    const r = await repo.updateProfile({ name: 'X' })
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error.code).toBe('not_found')
  })

  it('updates the profile fields', async () => {
    await prisma.user.create({
      data: {
        email: 'rei@fuurin.id',
        name: 'Rei',
        role: 'admin',
        avatar: 'https://example.com/avatar.jpg',
      },
    })
    const r = await repo.updateProfile({ name: 'Rei Updated' })
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.value.name).toBe('Rei Updated')
  })
})

describe('UserRepository.listMembers', () => {
  it('returns empty list when no members', async () => {
    const r = await repo.listMembers()
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.value).toEqual([])
  })

  it('returns members sorted by nameJa ascending', async () => {
    await prisma.member.create({
      data: { id: 'm-b', nameJa: '花', name: { ja: '花', id: 'Hana', en: 'Hana' } as object, role: {} as object, avatar: 'x' },
    })
    await prisma.member.create({
      data: { id: 'm-a', nameJa: 'あ', name: { ja: 'あ', id: 'A', en: 'A' } as object, role: {} as object, avatar: 'y' },
    })
    const r = await repo.listMembers()
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.value.map((m) => m.id)).toEqual(['m-a', 'm-b'])
    }
  })
})