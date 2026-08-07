/**
 * ApiClient provider — single point of swap.
 *
 * Per Sprint 13 / Sprint 14 the registry never sees the concrete
 * client. The implementation is chosen from environment variables:
 *
 *   NEXT_PUBLIC_API_MODE   'mock' (default) | 'fetch'
 *   NEXT_PUBLIC_API_BASE_URL
 *   NEXT_PUBLIC_API_VERSION            optional, e.g. 'v1'
 *   NEXT_PUBLIC_API_TIMEOUT_MS         default 15000
 *
 * Sprint 14 added the FetchApiClient + SessionAccessor path. Tests
 * can still call `__setApiClientForTesting` to swap at runtime.
 */

import type { ApiClient } from './api-client'
import { MockApiClient } from './mock-api-client'
import { authProvider } from '@/lib/auth/auth-provider'
import type { SessionAccessor } from '@/lib/api/session-accessor'
import { FetchApiClient } from '@/lib/api/fetch-api-client'
import { buildApiBaseUrl } from '@/lib/api/api-base-url'
import { noopLogger } from '@/lib/api/logger'
import { FetchAuthRepository, getAccessToken, setAccessToken } from './auth-repository'
import { getEnvironment } from '@/lib/config/env'
import type { ApiConfig } from '@/types/api-config'

function resolveConfig(): ApiConfig {
  const env = getEnvironment()
  return {
    mode: env.apiMode,
    baseUrl: env.apiBaseUrl,
    version: env.apiVersion,
    timeoutMs: env.apiTimeoutMs,
    retry: { max: 2, backoffMs: [400, 800] },
    defaultHeaders: {},
  }
}

/** Adapter — auth provider → SessionAccessor abstraction. */
const sessionAccessor: SessionAccessor = {
  getSession: () => authProvider.getSession(),
  resolveToken: () => {
    // In fetch mode, the access token is in-memory (set by login).
    const token = getAccessToken()
    return token ?? null
  },
}

function createApiClient(): ApiClient {
  const config = resolveConfig()
  if (config.mode === 'fetch') {
    return new FetchApiClient(config, {
      session: sessionAccessor,
      refreshToken: async () => {
        // Use raw fetch to avoid recursion — the refresh endpoint
        // must not go through the client (which would retry-on-401).
        try {
          const res = await fetch(`${buildApiBaseUrl(config)}/auth/refresh`, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: '{}',
            credentials: 'include',
          })
          if (!res.ok) return null
          const data = await res.json() as { accessToken: string }
          return { accessToken: data.accessToken }
        } catch {
          return null
        }
      },
      logger: process.env.NODE_ENV === 'production' ? noopLogger : undefined,
    })
  }
  return new MockApiClient()
}

let _apiClient: ApiClient | null = null

/** Lazy getter — tests can override via `__setApiClientForTesting`. */
export function getApiClient(): ApiClient {
  if (!_apiClient) _apiClient = createApiClient()
  return _apiClient
}

/** Direct singleton — used by the registry at import time. */
export const apiClient: ApiClient = createApiClient()

/** Escape hatch for tests: replace the singleton with a stub. */
export function __setApiClientForTesting(client: ApiClient | null): void {
  _apiClient = client
}


// Sprint 20A: export auth repo + token helpers.
export { FetchAuthRepository, getAccessToken, setAccessToken }
export type { AuthRepository } from './auth-repository'
