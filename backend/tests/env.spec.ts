/**
 * Environment validation — fail-fast tests.
 *
 * Invalid production config must throw `EnvironmentValidationError`
 * BEFORE the app starts. No partial startup (required refinement).
 */

import { describe, expect, it } from 'vitest'
import {
  DEV_JWT_SECRET,
  EnvironmentValidationError,
  __setEnvironmentForTesting,
  loadEnvironment,
} from '../src/config/env'

const VALID_ENV = {
  NODE_ENV: 'development',
  PORT: '4001',
  HOST: '127.0.0.1',
  DATABASE_URL: 'postgresql://fuurin:pw@127.0.0.1:5432/fuurin',
  LOG_LEVEL: 'info',
  STORAGE_DRIVER: 'local',
  STORAGE_LOCAL_ROOT: './storage/uploads',
  API_BASE_PATH: '/api/v1',
  API_VERSION: 'v1',
}

describe('environment validation (fail-fast)', () => {
  it('accepts a complete valid config', () => {
    const env = loadEnvironment(VALID_ENV)
    expect(env.NODE_ENV).toBe('development')
    expect(env.PORT).toBe(4001)
    expect(env.API_BASE_PATH).toBe('/api/v1')
  })

  it('throws on missing DATABASE_URL', () => {
    const { DATABASE_URL: _drop, ...rest } = VALID_ENV
    expect(() => loadEnvironment(rest)).toThrow(EnvironmentValidationError)
  })

  it('throws on non-postgresql DATABASE_URL', () => {
    expect(() =>
      loadEnvironment({ ...VALID_ENV, DATABASE_URL: 'mysql://x@localhost/x' }),
    ).toThrow(/DATABASE_URL must start with postgresql/)
  })

  it('throws on invalid PORT', () => {
    expect(() => loadEnvironment({ ...VALID_ENV, PORT: 'not-a-number' })).toThrow(
      EnvironmentValidationError,
    )
  })

  it('throws on unsupported STORAGE_DRIVER', () => {
    expect(() =>
      loadEnvironment({ ...VALID_ENV, STORAGE_DRIVER: 's3' }),
    ).toThrow(EnvironmentValidationError)
  })

  it('throws on base path not starting with /', () => {
    expect(() =>
      loadEnvironment({ ...VALID_ENV, API_BASE_PATH: 'api/v1' }),
    ).toThrow(EnvironmentValidationError)
  })

  it('falls back to the dev JWT secret outside production', () => {
    const env = loadEnvironment(VALID_ENV)
    expect(env.JWT_SECRET).toBe(DEV_JWT_SECRET)
  })

  it('throws when production leaves JWT_SECRET unset (dev default applies)', () => {
    expect(() =>
      loadEnvironment({ ...VALID_ENV, NODE_ENV: 'production' }),
    ).toThrow(/JWT_SECRET must be set to a real secret in production/)
  })

  it('throws when production explicitly uses the dev JWT secret', () => {
    expect(() =>
      loadEnvironment({
        ...VALID_ENV,
        NODE_ENV: 'production',
        JWT_SECRET: DEV_JWT_SECRET,
      }),
    ).toThrow(EnvironmentValidationError)
  })

  it('accepts production with a real JWT_SECRET', () => {
    const env = loadEnvironment({
      ...VALID_ENV,
      NODE_ENV: 'production',
      JWT_SECRET: 'a'.repeat(64),
    })
    expect(env.JWT_SECRET).toBe('a'.repeat(64))
  })

  afterEach(() => {
    __setEnvironmentForTesting(null)
  })
})