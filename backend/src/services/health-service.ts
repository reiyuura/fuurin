/**
 * Health service — process liveness probe + optional DB readiness probe.
 *
 * GET /api/v1/healthz
 *   → process info only (cheap, always available; suitable for k8s liveness).
 *
 * GET /api/v1/healthz?check=db
 *   → process info + `SELECT 1` against Postgres (5s timeout).
 *   → 200 with `database.status='ok'` on success.
 *   → 503 with `database.status='down'` and `error` message on failure.
 *     Frontend `error-mapper` maps 503 → `transport`.
 */

import type { Env } from '../config/env'
import { getPrisma } from '../database/prisma'

export type HealthStatus = 'ok' | 'degraded'

export type DatabaseHealth = {
  status: 'ok' | 'down'
  latencyMs?: number
  error?: string
}

export type HealthResult = {
  status: HealthStatus
  version: string
  uptime: number
  environment: string
  storage: string
  database?: DatabaseHealth
  timestamp: string
}

const DB_CHECK_TIMEOUT_MS = 5000

export function buildHealth(env: Env, startedAt: number): HealthResult {
  return {
    status: 'ok',
    version: process.env.npm_package_version ?? '1.0.0',
    uptime: Math.round((Date.now() - startedAt) / 1000),
    environment: env.NODE_ENV,
    storage: env.STORAGE_DRIVER,
    timestamp: new Date().toISOString(),
  }
}

export async function checkDatabase(): Promise<DatabaseHealth> {
  const prisma = getPrisma()
  const started = Date.now()
  try {
    // Race the SELECT 1 against a timeout.
    const probe = prisma.$queryRaw<Array<{ ok: number }>>`SELECT 1 AS ok`
    const timeout = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('timeout')), DB_CHECK_TIMEOUT_MS)
    })
    const rows = await Promise.race([probe, timeout])
    const latencyMs = Date.now() - started
    if (Array.isArray(rows) && rows.length > 0 && rows[0]?.ok === 1) {
      return { status: 'ok', latencyMs }
    }
    return { status: 'down', error: 'unexpected query result' }
  } catch (cause) {
    const latencyMs = Date.now() - started
    const message = cause instanceof Error ? cause.message : String(cause)
    return { status: 'down', error: message.slice(0, 200), latencyMs }
  }
}