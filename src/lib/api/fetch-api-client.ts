/**
 * fetch-api-client — ApiClient impl backed by fetch().
 *
 * Pipeline per request:
 *
 *   1. Build URL: baseUrl + version + path + query
 *   2. Inject auth header via SessionAccessor (zero AuthProvider refs)
 *   3. Compose timeout AbortController (cleared on response/retry)
 *   4. Build RequestInit via request-builder
 *   5. fetch()
 *   6. parseResponse → ApiResponse<T>
 *   7. On retryable status/transport → retry (GET only, max 2)
 *   8. Log everything (dev only, sanitized headers)
 *   9. Optional GET dedupe via RequestDedupe
 *
 * Repositories never touch `fetch`, `Response`, `Headers`, or
 * `JSON.parse` — they consume the `ApiResponse<T>` shape.
 */

import type { ApiClient, ApiRequest, ApiResponse } from '../repositories/api-client'
import type { ApiConfig, ApiResponseMeta } from '@/types/api-config'
import type { SessionAccessor } from './session-accessor'
import { injectAuthHeaders, sanitizeHeaders } from './auth-injector'
import { setAccessToken } from '../repositories/auth-repository'
import { withTimeout } from './timeout-controller'
import { buildRequestInit, prebuildBody } from './request-builder'
import { parseResponse } from './response-parser'
import { mapTransportError, isAbortError } from './error-mapper'
import { decideRetry } from './retry-policy'
import { RequestDedupe } from './request-dedupe'
import { devLogger, type Logger } from './logger'
import { buildApiBaseUrl } from './api-base-url'

export type TokenRefresher = () => Promise<{ accessToken: string } | null>

export type FetchApiClientDeps = {
  session: SessionAccessor
  /** Optional: called on 401 to refresh the token and retry once. */
  refreshToken?: TokenRefresher
  logger?: Logger
  dedupe?: RequestDedupe
  /** Injectable for tests. Defaults to setTimeout. */
  sleep?: (ms: number) => Promise<void>
  /** Injectable for tests. Defaults to global fetch. */
  fetcher?: typeof fetch
}

const REQUEST_ID_ALPHABET = '0123456789abcdefghijklmnopqrstuvwxyz'
function makeRequestId(): string {
  let out = ''
  for (let i = 0; i < 8; i++) {
    out += REQUEST_ID_ALPHABET[Math.floor(Math.random() * REQUEST_ID_ALPHABET.length)]
  }
  return out
}

const sleep = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms))

export class FetchApiClient implements ApiClient {
  private readonly config: ApiConfig
  private readonly session: SessionAccessor
  private readonly logger: Logger
  private readonly dedupe: RequestDedupe
  private readonly sleepFn: (ms: number) => Promise<void>
  private readonly fetcher: typeof fetch

  private readonly refreshToken?: TokenRefresher

  constructor(config: ApiConfig, deps: FetchApiClientDeps) {
    this.config = config
    this.session = deps.session
    this.refreshToken = deps.refreshToken
    this.logger = deps.logger ?? devLogger
    this.dedupe = deps.dedupe ?? new RequestDedupe()
    this.sleepFn = deps.sleep ?? sleep
    this.fetcher = deps.fetcher ?? (typeof fetch !== 'undefined'
      ? fetch.bind(globalThis)
      : (async () => {
          throw new Error('FetchApiClient: fetch is not available in this environment')
        }) as typeof fetch)
  }

  async request<T>(req: ApiRequest): Promise<ApiResponse<T>> {
    const params = req.query
      ? mergeQuery(new URLSearchParams(), req.query)
      : new URLSearchParams()

    const base = buildApiBaseUrl(this.config)
    const path = req.path.startsWith('/') ? req.path : `/${req.path}`
    const queryStr = params.toString()
    const url = `${base}${path}${queryStr ? `?${queryStr}` : ''}`

    // Dedupe — GET only. Body excluded by design.
    if (req.method === 'GET') {
      const key = RequestDedupe.key(req.method, `${base}${path}`, params)
      return this.dedupe.run(key, () => this.executeWithRetry<T>(req, url))
    }

    return this.executeWithRetry<T>(req, url)
  }

  private async executeWithRetry<T>(
    req: ApiRequest,
    url: string,
  ): Promise<ApiResponse<T>> {
    const requestId = makeRequestId()
    const baseHeaders: Record<string, string> = {
      Accept: 'application/json',
      'X-Request-Id': requestId,
      ...this.config.defaultHeaders,
    }
    let headers = await injectAuthHeaders(baseHeaders, this.session)
    const prebuilt = prebuildBody(req.body)
    let attempt = 0
    let lastStatus: number | undefined

    while (true) {
      const started = Date.now()
      const timeout = withTimeout(this.config.timeoutMs, req.signal)
      this.logger.debug({
        layer: 'api-client',
        requestId,
        method: req.method,
        url,
        headers: sanitizeHeaders(headers),
      })

      let res: Response | null = null
      let apiResponse: ApiResponse<T> | null = null
      const transportMeta: ApiResponseMeta = {
        status: 0,
        headers: {},
        durationMs: 0,
        requestId,
      }
      try {
        const init = buildRequestInit({
          method: req.method,
          body: req.body,
          headers,
          signal: timeout.signal,
          prebuiltBody: prebuilt,
        })
        res = await this.fetcher(url, init)
        lastStatus = res.status
        const durationMs = Date.now() - started
        transportMeta.status = res.status
        transportMeta.headers = headersToObject(res.headers)
        transportMeta.durationMs = durationMs
        apiResponse = await parseResponse<T>(res, transportMeta)
      } catch (cause) {
        timeout.cancel()
        transportMeta.durationMs = Date.now() - started
        const mapped = isAbortError(cause)
          ? { code: 'transport' as const, message: 'Permintaan timeout.' }
          : mapTransportError(cause)
        const decision = decideRetry({
          method: req.method,
          attempt,
          max: this.config.retry.max,
          backoffMs: this.config.retry.backoffMs,
          status: undefined,
        })
        this.logger.warn({
          layer: 'retry',
          requestId,
          method: req.method,
          url,
          error: { code: mapped.code, message: mapped.message },
        })
        if (decision.retry) {
          attempt += 1
          await this.sleepFn(decision.delayMs)
          continue
        }
        return {
          ok: false,
          status: 0,
          error: mapped,
          meta: transportMeta,
        }
      } finally {
        timeout.cancel()
      }

      const meta = apiResponse!.meta
      this.logger.debug({
        layer: 'api-client',
        requestId,
        method: req.method,
        url,
        status: meta.status,
        durationMs: meta.durationMs,
      })

      // --- Sprint 20C: 401 refresh interceptor ---
      if (meta.status === 401 && attempt === 0 && this.refreshToken) {
        try {
          const refreshed = await this.refreshToken()
          if (refreshed) {
            setAccessToken(refreshed.accessToken)
            headers = await injectAuthHeaders(baseHeaders, this.session)
            attempt += 1
            this.logger.info({ layer: 'auth', requestId })
            continue
          }
        } catch {
          this.logger.warn({ layer: 'auth', requestId })
        }
      }

      if (!apiResponse!.ok) {
        const decision = decideRetry({
          method: req.method,
          attempt,
          max: this.config.retry.max,
          backoffMs: this.config.retry.backoffMs,
          status: lastStatus,
        })
        if (decision.retry) {
          attempt += 1
          this.logger.warn({
            layer: 'retry',
            requestId,
            method: req.method,
            url,
            status: lastStatus,
            error: apiResponse!.error,
          })
          await this.sleepFn(decision.delayMs)
          continue
        }
      }
      return apiResponse!
    }
  }
}

function mergeQuery(
  base: URLSearchParams,
  extra: Record<string, string | number | boolean | undefined | null>,
): URLSearchParams {
  for (const [k, v] of Object.entries(extra)) {
    if (v === undefined || v === null || v === '') continue
    base.set(k, String(v))
  }
  return base
}

function headersToObject(headers: Headers): Record<string, string> {
  const out: Record<string, string> = {}
  headers.forEach((v, k) => {
    out[k] = v
  })
  return out
}
