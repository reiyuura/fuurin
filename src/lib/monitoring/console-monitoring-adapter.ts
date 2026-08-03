import { getEnvironment } from '@/lib/config/env'
import {
  sanitizeMonitoringValue,
  type MonitoringAdapter,
  type MonitoringContext,
  type MonitoringLevel,
} from './monitoring-adapter'

function defaultContext(): Pick<MonitoringContext, 'release' | 'environment'> {
  const env = getEnvironment()
  return { release: env.release, environment: env.nodeEnv }
}

export class ConsoleMonitoringAdapter implements MonitoringAdapter {
  captureException(error: unknown, context: Partial<MonitoringContext> = {}): void {
    const normalized = error instanceof Error
      ? { name: error.name, message: error.message, stack: error.stack }
      : { value: String(error) }
    this.emit('error', 'exception', { error: normalized, ...context })
  }

  captureMessage(
    message: string,
    level: MonitoringLevel = 'info',
    context: Partial<MonitoringContext> = {},
  ): void {
    this.emit(level, message, context)
  }

  trackMetric(name: string, value: number, tags: Record<string, string> = {}): void {
    this.emit('debug', 'metric', { metric: name, value, tags })
  }

  private emit(level: MonitoringLevel, message: string, payload: unknown): void {
    const body = sanitizeMonitoringValue({
      message,
      level,
      timestamp: new Date().toISOString(),
      ...defaultContext(),
      ...(payload as object),
    })

    // Development remains verbose. Production reports only operational
    // warnings/errors and never includes raw secrets due to sanitization.
    const env = getEnvironment()
    if (env.nodeEnv === 'production' && (level === 'debug' || level === 'info')) return

    const method = level === 'fatal' || level === 'error'
      ? 'error'
      : level === 'warning'
        ? 'warn'
        : 'debug'
    console[method]('[monitoring]', body)
  }
}
