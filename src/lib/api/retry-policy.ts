/**
 * retry-policy — pure: decides whether to retry a failed request.
 *
 * Per spec:
 *   - only GET requests
 *   - max 2 retries (i.e. up to 3 total attempts)
 *   - simple backoff (with jitter)
 */

import type { HttpMethod } from '@/types/api-config'
import { isRetryableStatus } from './error-mapper'

export type RetryDecision = {
  retry: boolean
  /** ms to wait before next attempt. */
  delayMs: number
}

export function decideRetry({
  method,
  attempt,
  max,
  backoffMs,
  status,
}: {
  method: HttpMethod
  attempt: number
  max: number
  backoffMs: readonly number[]
  status: number | undefined
}): RetryDecision {
  if (method !== 'GET') return { retry: false, delayMs: 0 }
  if (attempt >= max) return { retry: false, delayMs: 0 }
  if (!isRetryableStatus(status)) return { retry: false, delayMs: 0 }

  const base = backoffMs[attempt] ?? backoffMs[backoffMs.length - 1] ?? 400
  // Jitter 0.85x .. 1.15x
  const jitter = 0.85 + Math.random() * 0.3
  return { retry: true, delayMs: Math.round(base * jitter) }
}
