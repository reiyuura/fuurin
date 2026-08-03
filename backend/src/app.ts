/**
 * buildApp — assemble the Fastify application.
 *
 * Sprint 20A: @fastify/cookie + auth guard + auth routes wired.
 */

import Fastify, { type FastifyInstance, type FastifyServerOptions } from 'fastify'
import cookie from '@fastify/cookie'
import type { Env } from './config/env'
import { loggerOptions } from './plugins/logger'
import { configureRequestId } from './plugins/request-id'
import { configureErrorHandler } from './plugins/error-handler'
import { configureAuthGuard } from './plugins/auth-guard'
import { registerHealthRoutes } from './routes/health-routes'
import { registerReadRoutes } from './routes/read-routes'
import { registerWriteRoutes } from './routes/write-routes'
import { registerAuthRoutes } from './routes/auth-routes'
import { createStorageProvider, type StorageProvider } from './storage'
import { createPrismaRepositories, type Repositories } from './repositories/registry'
import { createServices, type Services } from './services'
import { AuthRepository } from './auth/auth-repository'
import { BcryptPasswordHasher } from './auth/password-hasher'
import { createAuthService, type AuthService } from './services/auth-service'
import { getPrisma } from './database/prisma'

export type AppContext = {
  env: Env
  storage: StorageProvider
  services: Services
  auth: AuthService
  repositories: Repositories
  startedAt: number
}

export type BuildAppOptions = {
  /** Override repository construction (tests inject fakes/test DB). */
  repositories?: Repositories
  /** Override auth service (tests inject fakes). */
  authService?: AuthService
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

  // Plugins: cookie parser, request-id, error handler, auth guard.
  await app.register(cookie)
  configureRequestId(app)
  configureErrorHandler(app)
  configureAuthGuard(app, env)

  // Storage provider — resolved once, shared across the app.
  const storage = createStorageProvider(env)

  // Repositories (Sprint 17) + services (Sprint 18-19).
  const repositories = options.repositories ?? createPrismaRepositories(getPrisma())
  const services = createServices(repositories)

  // Auth service (Sprint 20A).
  const auth = options.authService ?? createAuthService({
    env,
    repo: new AuthRepository(getPrisma()),
    hasher: new BcryptPasswordHasher(),
  })

  const ctx: AppContext = { env, storage, services, auth, repositories, startedAt }

  // All routes live under the configured base path (/api/v1).
  await app.register(
    async (api) => {
      await registerHealthRoutes(api, env, startedAt)
      await registerReadRoutes(api, services)
      await registerWriteRoutes(api, services.writes)
      await registerAuthRoutes(api, auth, env)
    },
    { prefix: env.API_BASE_PATH },
  )

  return { app, ctx }
}