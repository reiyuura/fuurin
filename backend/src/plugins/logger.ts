/**
 * Logger configuration — Pino options.
 *
 * Redacts sensitive values so bearer tokens, passwords, cookies, and
 * secrets never reach logs (paradigm parity with the frontend
 * `MonitoringAdapter.sanitizeMonitoringValue` redaction set).
 */

import type { LoggerOptions } from 'pino'

export const REDACT_KEYS = [
  'req.headers.authorization',
  'authorization',
  'password',
  'token',
  'secret',
  'cookie',
  'session',
].join(',')

export function loggerOptions(level: string): LoggerOptions {
  return {
    level,
    redact: {
      paths: REDACT_KEYS.split(','),
      censor: '[REDACTED]',
    },
  }
}