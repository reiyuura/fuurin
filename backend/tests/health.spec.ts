/**
 * Health endpoint + error envelope tests against the real Fastify app
 * via `fastify.inject()` (no network). A fresh app is built per test to
 * avoid route re-registration collisions.
 */

import { afterEach, describe, expect, it } from 'vitest'
import type { FastifyInstance } from 'fastify'
import { buildApp } from '../src/app'
import { __setEnvironmentForTesting, loadEnvironment } from '../src/config/env'

const VALID_ENV = {
  NODE_ENV: 'test',
  PORT: '4001',
  HOST: '127.0.0.1',
  DATABASE_URL: 'postgresql://fuurin:pw@127.0.0.1:5432/fuurin',
  LOG_LEVEL: 'silent',
  STORAGE_DRIVER: 'local',
  STORAGE_LOCAL_ROOT: './storage/uploads',
  API_BASE_PATH: '/api/v1',
  API_VERSION: 'v1',
}

async function freshApp(): Promise<FastifyInstance> {
  const env = loadEnvironment(VALID_ENV)
  const { app } = await buildApp(env, { logger: false })
  return app
}

afterEach(async () => {
  __setEnvironmentForTesting(null)
})

describe('health endpoint', () => {
  it('GET /api/v1/healthz returns 200 JSON with expected fields', async () => {
    const app = await freshApp()
    try {
      const res = await app.inject({ method: 'GET', url: '/api/v1/healthz' })

      expect(res.statusCode).toBe(200)
      expect(res.headers['content-type']).toMatch(/application\/json/)
      const body = res.json()
      expect(body.status).toBe('ok')
      expect(body.environment).toBe('test')
      expect(body.storage).toBe('local')
      expect(typeof body.uptime).toBe('number')
      expect(typeof body.timestamp).toBe('string')
      expect(new Date(body.timestamp).toISOString()).toBe(body.timestamp)
    } finally {
      await app.close()
    }
  })

  it('echoes the client X-Request-Id', async () => {
    const app = await freshApp()
    try {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/healthz',
        headers: { 'x-request-id': 'abc123' },
      })
      expect(res.statusCode).toBe(200)
      expect(res.headers['x-request-id']).toBe('abc123')
    } finally {
      await app.close()
    }
  })

  it('404s outside the API base path', async () => {
    const app = await freshApp()
    try {
      const res = await app.inject({ method: 'GET', url: '/healthz' })
      expect(res.statusCode).toBe(404)
    } finally {
      await app.close()
    }
  })
})

describe('error envelope (parity with frontend error-mapper)', () => {
  it('unknown route returns 404 with { message } JSON body', async () => {
    const app = await freshApp()
    try {
      const res = await app.inject({ method: 'GET', url: '/api/v1/nope' })
      expect(res.statusCode).toBe(404)
      const body = res.json()
      expect(typeof body.message).toBe('string')
      expect(typeof body.code).toBe('string')
    } finally {
      await app.close()
    }
  })

  it('handles thrown errors as 500 transport envelope', async () => {
    const app = await freshApp()
    // Register a route that throws, then hit it (before the app is ready).
    app.get('/api/v1/boom', () => {
      throw new Error('kaboom')
    })
    try {
      const res = await app.inject({ method: 'GET', url: '/api/v1/boom' })
      expect(res.statusCode).toBe(500)
      const body = res.json()
      expect(body.code).toBe('transport')
      expect(typeof body.message).toBe('string')
    } finally {
      await app.close()
    }
  })
})