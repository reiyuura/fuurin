/**
 * buildApp — assemble the Fastify application.
 *
 * Single export used by both tests (`fastify.inject`) and the server
 * entry (`server.ts`). Registers plugins in dependency order, mounts
 * all routes under `API_BASE_PATH` (`/api/v1`), and returns an app that
 * is ready to listen.
 *
 * Sprint 16: foundation only. No auth, no CRUD, no upload business.
 */

import Fastify, { type FastifyInstance, type FastifyServerOptions } from 'fastify'
import type { Env } from './config/env'
import { loggerOptions } from './plugins/logger'
import { configureRequestId } from './plugins/request-id'
import { configureErrorHandler } from './plugins/error-handler'
import { registerHealthRoutes } from './routes/health-routes'
import { createStorageProvider, type StorageProvider } from './storage'

export type AppContext = {
  env: Env
  storage: StorageProvider
  startedAt: number
}

export async function buildApp(
  env: Env,
  overrides: Partial<FastifyServerOptions> = {},
): Promise<{ app: FastifyInstance; ctx: AppContext }> {
  const startedAt = Date.now()

  const app = Fastify({
    logger: loggerOptions(env.LOG_LEVEL),
    trustProxy: true,
    disableRequestLogging: false,
    ...overrides,
  })

  // Logging (via Fastify pino), request-id, global error handling.
  // These are applied directly to the ROOT instance (not as registered
  // plugins) so all routes inherit them regardless of registration scope.
  configureRequestId(app)
  configureErrorHandler(app)

  // Storage provider — resolved once, shared across the app.
  const storage = createStorageProvider(env)

  const ctx: AppContext = { env, storage, startedAt }

  // All routes live under the configured base path (/api/v1).
  await app.register(
    async (api) => {
      await registerHealthRoutes(api, env, startedAt)
    },
    { prefix: env.API_BASE_PATH },
  )

  return { app, ctx }
}