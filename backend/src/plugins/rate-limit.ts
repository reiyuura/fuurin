/**
 * Rate limit plugin — in-memory fixed window (Sprint 25).
 *
 * Per-route limits on sensitive endpoints. Single-instance backend
 * (PM2 fork), so in-memory is sufficient; multi-instance would need
 * Redis.
 */

import type { FastifyInstance, FastifyRequest } from 'fastify'
import type { Env } from '../config/env'
import { ApiError } from '../shared/errors'

type Window = { count: number; resetAt: number }

export type RateLimitOptions = {
  /** Max requests per window. */
  max: number
  /** Window size in milliseconds. */
  windowMs: number
}

export function rateLimit(opts: RateLimitOptions & { enabled?: boolean }) {
  const buckets = new Map<string, Window>()

  // Periodically evict expired windows to bound memory.
  const sweep = setInterval(() => {
    const now = Date.now()
    for (const [k, v] of buckets) {
      if (v.resetAt <= now) buckets.delete(k)
    }
  }, opts.windowMs * 2)
  sweep.unref()

  return async function limit(request: FastifyRequest): Promise<void> {
    if (opts.enabled === false) return
    const key = request.ip
    const now = Date.now()
    const w = buckets.get(key)
    if (!w || w.resetAt <= now) {
      buckets.set(key, { count: 1, resetAt: now + opts.windowMs })
      return
    }
    w.count++
    if (w.count > opts.max) {
      throw new ApiError('transport', 'Terlalu banyak percobaan. Coba lagi nanti.', undefined, {
        status: 429,
      })
    }
  }
}

export function configureRateLimits(app: FastifyInstance, env: Env): void {
  // Disabled in test runs — suites issue many auth calls per second.
  const enabled = env.NODE_ENV !== 'test'
  const authLimit = rateLimit({ max: 10, windowMs: 60_000, enabled }) // 10/min per IP
  const uploadLimit = rateLimit({ max: 30, windowMs: 60_000, enabled }) // 30/min per IP

  app.decorate('rateLimitAuth', authLimit)
  app.decorate('rateLimitUpload', uploadLimit)
}

declare module 'fastify' {
  interface FastifyInstance {
    rateLimitAuth: (request: FastifyRequest) => Promise<void>
    rateLimitUpload: (request: FastifyRequest) => Promise<void>
  }
}