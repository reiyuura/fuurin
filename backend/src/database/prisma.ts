/**
 * Prisma client singleton.
 *
 * Sprint 16 wires the client so `prisma generate` + a live connection
 * run; no models are referenced yet (those arrive in Sprint 17).
 * The client is created lazily so tests that don't touch the DB never
 * force a connection.
 */

import { PrismaClient } from '@prisma/client'

let _prisma: PrismaClient | null = null

export function getPrisma(): PrismaClient {
  if (!_prisma) {
    _prisma = new PrismaClient()
  }
  return _prisma
}

/** Test hook — replace the singleton (e.g. with a mock). */
export function __setPrismaForTesting(client: PrismaClient | null): void {
  _prisma = client
}