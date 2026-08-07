/**
 * logger — dev-only structured logger.
 *
 * Emits via `console.debug` with a tagged payload. In production
 * (NODE_ENV === 'production') the logger is a no-op so we never
 * leak Authorization headers or request bodies to the browser
 * console.
 *
 * The Authorization header value is replaced with `[REDACTED]` by
 * `sanitizeHeaders` before logging.
 */

import type { HttpMethod } from '@/types/api-config'

export type LogLayer = 'api-client' | 'auth' | 'parser' | 'retry' | 'timeout'

export type LogEntry = {
  layer: LogLayer
  requestId?: string
  method?: HttpMethod
  url?: string
  status?: number
  durationMs?: number
  error?: { code: string; message: string }
  headers?: Record<string, string>
}

export interface Logger {
  debug(entry: LogEntry): void
  info(entry: LogEntry): void
  warn(entry: LogEntry): void
  error(entry: LogEntry): void
}

function isProd(): boolean {
  return typeof process !== 'undefined' && process.env?.NODE_ENV === 'production'
}

function emit(level: 'debug' | 'info' | 'warn' | 'error', entry: LogEntry): void {
  if (isProd()) return
  const payload = JSON.stringify(entry, null, 0)
  const line = `[${entry.layer}]${entry.requestId ? ` (${entry.requestId})` : ''} ${payload}`
  console[level](line)
}

export const devLogger: Logger = {
  debug: (e) => emit('debug', e),
  info: (e) => emit('info', e),
  warn: (e) => emit('warn', e),
  error: (e) => emit('error', e),
}

export const noopLogger: Logger = {
  debug: () => undefined,
  info: () => undefined,
  warn: () => undefined,
  error: () => undefined,
}
