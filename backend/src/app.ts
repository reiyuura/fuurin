/**
 * buildApp — assemble the Fastify application.
 *
 * Sprint 20C: multipart upload plugin + upload routes wired.
 */

import Fastify, { type FastifyInstance, type FastifyServerOptions } from 'fastify'
import cookie from '@fastify/cookie'
import multipart from '@fastify/multipart'
import type { Env } from './config/env'
import { loggerOptions } from './plugins/logger'
import { configureRequestId } from './plugins/request-id'
import { configureErrorHandler } from './plugins/error-handler'
import { configureAuthGuard } from './plugins/auth-guard'
import { registerHealthRoutes } from './routes/health-routes'
import { registerReadRoutes } from './routes/read-routes'
import { registerWriteRoutes } from './routes/write-routes'
import { registerAuthRoutes } from './routes/auth-routes'
import { registerUploadRoutes } from './routes/upload-routes'
import { registerStatsRoutes } from './routes/stats-routes'
import { createStorageProvider, type StorageProvider } from './storage'
import { createPrismaRepositories, type Repositories } from './repositories/registry'
import { createServices, type Services } from './services'
import { AuthRepository } from './auth/auth-repository'
import { BcryptPasswordHasher } from './auth/password-hasher'
import { createAuthService, type AuthService } from './services/auth-service'
import { UploadService } from './services/upload-service'
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
  repositories?: Repositories
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

  // Plugins: cookie, multipart, request-id, error handler, auth guard.
  await app.register(cookie)
  await app.register(multipart, { limits: { fileSize: env.UPLOAD_MAX_BYTES } })
  configureRequestId(app)
  configureErrorHandler(app)
  configureAuthGuard(app, env)

  // Storage provider.
  const storage = createStorageProvider(env)

  // Repositories + services.
  const repositories = options.repositories ?? createPrismaRepositories(getPrisma())
  const services = createServices(repositories)

  // Auth service.
  const auth = options.authService ?? createAuthService({
    env,
    repo: new AuthRepository(getPrisma()),
    hasher: new BcryptPasswordHasher(),
  })

  // Upload service.
  const uploadService = new UploadService(storage, env)

  const ctx: AppContext = { env, storage, services, auth, repositories, startedAt }

  // All routes under /api/v1.
  await app.register(
    async (api) => {
      await registerHealthRoutes(api, env, startedAt)
      await registerReadRoutes(api, services)
      await registerWriteRoutes(api, services.writes)
      await registerAuthRoutes(api, auth, env)
      await registerUploadRoutes(api, uploadService)
      await registerStatsRoutes(api)
    },
    { prefix: env.API_BASE_PATH },
  )

  return { app, ctx }
}