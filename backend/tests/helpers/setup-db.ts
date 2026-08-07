/**
 * Test database fixture — fresh client per test, with all migrations
 * applied to the configured `fuurin_test` database.
 *
 * Each test gets a clean slate: tables are truncated before/after.
 *
 * SAFETY (Sprint 25): the test client is PINNED to the `fuurin_test`
 * database. `process.env.DATABASE_URL` points at production in dev
 * shells and PM2 environments — honoring it here would TRUNCATE
 * production data on every `vitest run`. We therefore:
 *   1. Always derive the URL as <prod-url-without-db>/fuurin_test.
 *   2. Refuse to run when the derived DB name is not `fuurin_test`.
 */

import { PrismaClient } from '@prisma/client'

let _client: PrismaClient | null = null

function resolveTestUrl(): string {
  const raw =
    process.env.DATABASE_URL ??
    'postgresql://fuurin:***@127.0.0.1:5432/fuurin_test'
  // Strip any trailing db name and pin to fuurin_test.
  const base = raw.replace(/\/[^/?]+(\?.*)?$/, '')
  const url = `${base}/fuurin_test`
  if (!url.includes('/fuurin_test')) {
    throw new Error('Refusing to run tests against a non-test database.')
  }
  return url
}

/**
 * Pin the whole process to the test database. Called from test setup
 * files BEFORE `buildApp()` so every `getPrisma()` consumer inside the
 * app (AuditService, DraftRepository, AuthRepository fallback) also
 * targets `fuurin_test` — never production.
 */
export function pinTestDatabaseEnv(): void {
  process.env.DATABASE_URL = resolveTestUrl()
}

export async function getTestPrisma(): Promise<PrismaClient> {
  if (_client) return _client
  _client = new PrismaClient({ datasources: { db: { url: resolveTestUrl() } } })
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
  // AuditLog included — audit rows from previous spec files/runs must
  // not leak into a test's assertions (they accumulate otherwise).
  await prisma.$executeRawUnsafe(
    `TRUNCATE TABLE "TimelineEntry","AlbumDraft","Photo","UploadRecord","Album","Member","Session","User","AuditLog" RESTART IDENTITY CASCADE`,
  )
}