export type MonitoringLevel = 'debug' | 'info' | 'warning' | 'error' | 'fatal'

/** Standard context shared by all future monitoring adapters. */
export type MonitoringContext = {
  requestId?: string
  pathname?: string
  userId?: string
  release: string
  environment: string
  tags?: Record<string, string>
  extra?: Record<string, string | number | boolean | null | undefined>
}

export interface MonitoringAdapter {
  captureException(error: unknown, context?: Partial<MonitoringContext>): void
  captureMessage(
    message: string,
    level?: MonitoringLevel,
    context?: Partial<MonitoringContext>,
  ): void
  trackMetric(name: string, value: number, tags?: Record<string, string>): void
}

export const SENSITIVE_KEYS = /authorization|token|password|secret|cookie|session/i

export function sanitizeMonitoringValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sanitizeMonitoringValue)
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {}
    for (const [key, nested] of Object.entries(value)) {
      out[key] = SENSITIVE_KEYS.test(key) ? '[REDACTED]' : sanitizeMonitoringValue(nested)
    }
    return out
  }
  return value
}
