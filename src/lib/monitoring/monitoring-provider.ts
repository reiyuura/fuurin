import type { MonitoringAdapter } from './monitoring-adapter'
import { ConsoleMonitoringAdapter } from './console-monitoring-adapter'

let adapter: MonitoringAdapter = new ConsoleMonitoringAdapter()

/** Stable facade. Future Sentry/OTel/Datadog adapters replace only the provider. */
export const monitoring: MonitoringAdapter = {
  captureException: (error, context) => adapter.captureException(error, context),
  captureMessage: (message, level, context) => adapter.captureMessage(message, level, context),
  trackMetric: (name, value, tags) => adapter.trackMetric(name, value, tags),
}

export function setMonitoringAdapter(next: MonitoringAdapter): void {
  adapter = next
}
