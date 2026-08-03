/**
 * Health service — process liveness probe.
 *
 * Returns uptime, version, environment, storage driver, timestamp, and
 * release. `runtime = 'nodejs'` so `process.uptime()` is valid.
 * No DB round-trip in Sprint 16 (no models yet).
 */

import type { Env } from '../config/env'

export type HealthStatus = 'ok'

export type HealthResult = {
  status: HealthStatus
  version: string
  uptime: number
  environment: string
  storage: string
  timestamp: string
}

export function buildHealth(env: Env, startedAt: number): HealthResult {
  return {
    status: 'ok',
    version: process.env.npm_package_version ?? '16.0.0',
    uptime: Math.round((Date.now() - startedAt) / 1000),
    environment: env.NODE_ENV,
    storage: env.STORAGE_DRIVER,
    timestamp: new Date().toISOString(),
  }
}