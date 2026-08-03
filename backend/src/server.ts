/**
 * Server entry — parse env (fail-fast), build app, listen.
 *
 * On invalid production config, `loadEnvironment()` throws BEFORE the
 * app binds — no partial (degraded) startup (fail-fast requirement).
 */

import { loadEnvironment } from './config/env'
import { buildApp } from './app'

async function main(): Promise<void> {
  const env = loadEnvironment() // throws on invalid config
  const { app } = await buildApp(env)

  for (const signal of ['SIGINT', 'SIGTERM'] as const) {
    process.on(signal, () => {
      app.log.info(`received ${signal}, shutting down`)
      void app.close().then(() => process.exit(0))
    })
  }

  try {
    await app.listen({ port: env.PORT, host: env.HOST })
  } catch (err) {
    app.log.error(err)
    process.exit(1)
  }
}

void main()