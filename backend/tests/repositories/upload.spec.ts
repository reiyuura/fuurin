/**
 * UploadRepository tests — PrismaUploadRepository against the real test DB.
 * Covers list(), record(), remove(), clear().
 */

import { afterAll, beforeEach, describe, expect, it } from 'vitest'
import type { PrismaClient } from '@prisma/client'
import { PrismaUploadRepository } from '../../src/repositories/prisma-upload-repository'
import { truncateAll, getTestPrisma, disconnectTestPrisma } from '../helpers/setup-db'
import type { UploadInput } from '../../src/domain/models'

let prisma: PrismaClient
let repo: PrismaUploadRepository

beforeEach(async () => {
  prisma = await getTestPrisma()
  await truncateAll(prisma)
  repo = new PrismaUploadRepository(prisma)
})

afterAll(async () => {
  await disconnectTestPrisma()
})

const input = (id: string, overrides: Partial<UploadInput> = {}): UploadInput => ({
  id,
  fileName: 'photo.jpg',
  sizeBytes: 1024,
  mimeType: 'image/jpeg',
  status: 'queued',
  progress: 0,
  ...overrides,
})

describe('UploadRepository.record', () => {
  it('persists and returns the upload mapped to domain shape', async () => {
    const r = await repo.record(input('u-1'))
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.value.id).toBe('u-1')
      expect(r.value.fileName).toBe('photo.jpg')
      expect(r.value.status).toBe('queued')
      expect(typeof r.value.createdAt).toBe('string')
    }
  })
})

describe('UploadRepository.list', () => {
  it('returns uploads sorted by createdAt desc', async () => {
    await repo.record(input('u-1'))
    await repo.record(input('u-2'))
    const r = await repo.list()
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.value).toHaveLength(2)
      const ids = r.value.map((u) => u.id)
      // createdAt desc — second record created after first.
      expect(ids).toEqual(['u-2', 'u-1'])
    }
  })
})

describe('UploadRepository.remove', () => {
  it('is idempotent for missing id', async () => {
    const r = await repo.remove('does-not-exist')
    expect(r.ok).toBe(true)
  })

  it('removes an existing upload', async () => {
    await repo.record(input('u-3'))
    const del = await repo.remove('u-3')
    expect(del.ok).toBe(true)
    const list = await repo.list()
    if (list.ok) expect(list.value).toHaveLength(0)
  })
})

describe('UploadRepository.clear', () => {
  it('empties the upload table', async () => {
    await repo.record(input('u-4'))
    await repo.record(input('u-5'))
    const r = await repo.clear()
    expect(r.ok).toBe(true)
    const list = await repo.list()
    if (list.ok) expect(list.value).toHaveLength(0)
  })
})