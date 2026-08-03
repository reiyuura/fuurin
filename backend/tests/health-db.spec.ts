/**
 * Health ?check=db tests — verifies the readiness probe against the
 * real test Postgres. Uses `__setPrismaForTesting` to point the health
 * service at the `fuurin_test` database.
 *
 * NOTE: these tests intentionally run serially with the repository
 * specs; they share the `fuurin_test` database but only SELECT 1, so no
 * data is touched.
 */

import { afterAll, beforeAll, afterEach, describe, expect, it } from 'vitest'
import type { FastifyInstance } from 'fastify'
import { buildApp } from '../src/app'
import { __setEnvironmentForTesting, loadEnvironment } from '../src/config/env'
import { getPrisma, __setPrismaForTesting } from '../src/database/prisma'
import { disconnectTestPrisma, getTestPrisma } from './helpers/setup-db'

const VALID_ENV = {
  NODE_ENV: 'test',
  PORT: '4001',
  HOST: '127.0.0.1',
  DATABASE_URL: 'postgresql://fuurin:***@127.0.0.1:5432/fuurin',
  LOG_LEVEL: 'silent',
  STORAGE_DRIVER: 'local',
  STORAGE_LOCAL_ROOT: './storage/uploads',
  API_BASE_PATH: '/api/v1',
  API_VERSION: 'v1',
}

beforeAll(async () => {
  // Point the health service at the test database.
  const client = await getTestPrisma()
  __setPrismaForTesting(client)
})

afterEach(() => {
  __setEnvironmentForTesting(null)
})

afterAll(async () => {
  await disconnectTestPrisma()
  __setPrismaForTesting(null)
})

async function freshApp(): Promise<FastifyInstance> {
  const env = loadEnvironment(VALID_ENV)
  const { app } = await buildApp(env, { logger: false })
  return app
}

describe('health ?check=db', () => {
  it('returns 200 with database.status ok when DB is reachable', async () => {
    const app = await freshApp()
    try {
      const res = await app.inject({ method: 'GET', url: '/api/v1/healthz?check=db' })
      expect(res.statusCode).toBe(200)
      const body = res.json()
      expect(body.status).toBe('ok')
      expect(body.database.status).toBe('ok')
      expect(typeof body.database.latencyMs).toBe('number')
    } finally {
      await app.close()
    }
  })

  it('still returns process info alongside the database probe', async () => {
    const app = await freshApp()
    try {
      const res = await app.inject({ method: 'GET', url: '/api/v1/healthz?check=db' })
      const body = res.json()
      expect(typeof body.uptime).toBe('number')
      expect(body.environment).toBe('test')
      expect(body.storage).toBe('local')
    } finally {
      await app.close()
    }
  })

  it('returns 503 with database.status down when DB is unreachable', async () => {
    // Replace the singleton with a client pointed at a dead port.
    const dead = getPrisma()
    // Use a client whose datasource is unreachable.
    const { PrismaClient } = await import('@prisma/client')
    const bad = new PrismaClient({
      datasources: { db: { url: 'postgresql://fuurin:wrong@127.0.0.1:1/fuurin_test' } },
    })
    __setPrismaForTesting(bad)
    try {
      const app = await freshApp()
      try {
        const res = await app.inject({ method: 'GET', url: '/api/v1/healthz?check=db' })
        expect(res.statusCode).toBe(503)
        const body = res.json()
        expect(body.status).toBe('degraded')
        expect(body.database.status).toBe('down')
        expect(typeof body.database.error).toBe('string')
        expect(body.database.error!.length).toBeGreaterThan(0)
      } finally {
        await app.close()
      }
    } finally {
      await bad.$disconnect()
      __setPrismaForTesting(dead!)
    }
  })
})