/**
 * buildApp — assemble the Fastify application.
 *
 * Single export used by both tests (`fastify.inject`) and the server
 * entry (`server.ts`). Registers plugins in dependency order, mounts
 * all routes under `API_BASE_PATH` (`/api/v1`), and returns an app that
 * is ready to listen.
 *
 * Sprint 18: READ APIs wired — repositories → services → controllers →
 * routes. No auth, no CRUD, no upload business.
 */

import Fastify, { type FastifyInstance, type FastifyServerOptions } from 'fastify'
import type { Env } from './config/env'
import { loggerOptions } from './plugins/logger'
import { configureRequestId } from './plugins/request-id'
import { configureErrorHandler } from './plugins/error-handler'
import { registerHealthRoutes } from './routes/health-routes'
import { registerReadRoutes } from './routes/read-routes'
import { createStorageProvider, type StorageProvider } from './storage'
import { createPrismaRepositories, type Repositories } from './repositories/registry'
import { createServices, type Services } from './services'
import { getPrisma } from './database/prisma'

export type AppContext = {
  env: Env
  storage: StorageProvider
  services: Services
  repositories: Repositories
  startedAt: number
}

export type BuildAppOptions = {
  /** Override repository construction (tests inject fakes/test DB). */
  repositories?: Repositories
}

export async function buildApp(
  env: Env,
  overrides: Partial<FastifyServerOptions> = {},
  options: BuildAppOptions = {},
): Promise<{ app: FastifyInstance; ctx: AppContext }> {
  const startedAt = Date.now()

  const app = Fastify({
    logger: loggerOptions(env.LOG_LEVEL),
    trustProxy: true,
    disableRequestLogging: false,
    ...overrides,
  })

  // Logging (via Fastify pino), request-id, global error handling.
  configureRequestId(app)
  configureErrorHandler(app)

  // Storage provider — resolved once, shared across the app.
  const storage = createStorageProvider(env)

  // Repositories (Sprint 17) + services (Sprint 18).
  const repositories = options.repositories ?? createPrismaRepositories(getPrisma())
  const services = createServices(repositories)

  const ctx: AppContext = { env, storage, services, repositories, startedAt }

  // All routes live under the configured base path (/api/v1).
  await app.register(
    async (api) => {
      await registerHealthRoutes(api, env, startedAt)
      await registerReadRoutes(api, services)
    },
    { prefix: env.API_BASE_PATH },
  )

  return { app, ctx }
}