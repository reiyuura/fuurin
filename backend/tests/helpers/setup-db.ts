/**
 * Test database fixture — fresh client per test, with all migrations
 * applied to the configured `fuurin_test` database.
 *
 * Each test gets a clean slate: tables are truncated before/after.
 */

import { PrismaClient } from '@prisma/client'

let _client: PrismaClient | null = null

export async function getTestPrisma(): Promise<PrismaClient> {
  if (_client) return _client
  const url =
    process.env.DATABASE_URL ??
    'postgresql://fuurin:fuurin_dev_pw@127.0.0.1:5432/fuurin_test'
  _client = new PrismaClient({ datasources: { db: { url } } })
  return _client
}

export async function disconnectTestPrisma(): Promise<void> {
  if (_client) {
    await _client.$disconnect()
    _client = null
  }
}

/** Wipe all data from every table. Order respects FK constraints. */
export async function truncateAll(prisma: PrismaClient): Promise<void> {
  // $executeRawUnsafe with TRUNCATE … CASCADE is the only fast option
  // for wiping a multi-table dataset.
  await prisma.$executeRawUnsafe(
    `TRUNCATE TABLE "TimelineEntry","AlbumDraft","Photo","UploadRecord","Album","Member","Session","User" RESTART IDENTITY CASCADE`,
  )
}