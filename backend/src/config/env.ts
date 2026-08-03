/**
 * Environment configuration — single source of truth.
 *
 * Parsed ONCE at startup with zod; invalid production config throws
 * before the app listens (fail-fast, mirroring the frontend
 * `validate-env.mjs` / `instrumentation.ts` behavior).
 */

import { z } from 'zod'

const envSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'test', 'production'])
    .default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(4001),
  HOST: z.string().default('127.0.0.1'),
  DATABASE_URL: z
    .string()
    .startsWith('postgresql://', { message: 'DATABASE_URL must start with postgresql://' }),
  LOG_LEVEL: z
    .enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'])
    .default('info'),
  STORAGE_DRIVER: z.enum(['local']).default('local'),
  STORAGE_LOCAL_ROOT: z.string().default('./storage/uploads'),
  API_BASE_PATH: z.string().startsWith('/').default('/api/v1'),
  API_VERSION: z.string().default('v1'),
  /** JWT signing secret — must be ≥32 chars. */
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters').default(
    // Dev-only default; production throws via validateEnvironment().
    'dev-only-secret-do-not-use-in-production-replace-me!!',
  ),
  /** Access token TTL in seconds (default 15min). */
  JWT_ACCESS_TTL_SEC: z.coerce.number().int().min(60).max(86400).default(900),
  /** Refresh token TTL in seconds (default 7d). */
  JWT_REFRESH_TTL_SEC: z.coerce.number().int().min(3600).max(2592000).default(604800),
  /** Refresh token cookie name. */
  JWT_REFRESH_COOKIE: z.string().default('fuurin_rt'),
  /** Max upload size in bytes (default 10MB). */
  UPLOAD_MAX_BYTES: z.coerce.number().int().min(1024).max(100_000_000).default(10_000_000),
})

export type Env = z.infer<typeof envSchema>

export class EnvironmentValidationError extends Error {
  readonly issues: string[]

  constructor(issues: string[]) {
    super(`Invalid environment configuration:\n  - ${issues.join('\n  - ')}`)
    this.name = 'EnvironmentValidationError'
    this.issues = issues
  }
}

let _env: Env | null = null

/** Parse and validate process.env — throws EnvironmentValidationError on failure. */
export function loadEnvironment(source: NodeJS.ProcessEnv = process.env): Env {
  const parsed = envSchema.safeParse(source)
  if (!parsed.success) {
    const issues = parsed.error.issues.map(
      (i) => `${i.path.join('.')}: ${i.message}`,
    )
    throw new EnvironmentValidationError(issues)
  }
  return parsed.data
}

/** Memoized accessor — every consumer reads the SAME validated config. */
export function getEnvironment(): Env {
  if (!_env) _env = loadEnvironment()
  return _env
}

/** Test hook — re-parse from a custom source. */
export function __setEnvironmentForTesting(env: Env | null): void {
  _env = env
}
