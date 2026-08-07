/**
 * FetchApiClient unit tests — the riskiest frontend transport module.
 *
 * Everything injectable IS injected: `fetcher` (stubbed Responses),
 * `sleep` (instant), `logger` (noop). No real network, no real timers
 * except the timeout test (10ms real timeout).
 */

import { describe, expect, it } from 'vitest'
import { FetchApiClient } from './fetch-api-client'
import { buildApiBaseUrl } from './api-base-url'
import { noopLogger } from './logger'
import type { ApiConfig } from '@/types/api-config'
import type { SessionAccessor } from './session-accessor'
import type { Session } from '@/types/auth'

const CONFIG: ApiConfig = {
  mode: 'fetch',
  baseUrl: 'https://api.example.com/api',
  version: 'v1',
  timeoutMs: 5_000,
  retry: { max: 2, backoffMs: [1, 1] },
  defaultHeaders: {},
}

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}

function guestSession(): SessionAccessor {
  return { getSession: async () => null, resolveToken: () => null }
}

function authedSession(token: string): SessionAccessor {
  const session: Session = {
    user: { id: 'u1', name: 'U', email: 'u@x.id', role: 'admin', avatar: '' },
    issuedAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 60_000).toISOString(),
    token,
  }
  return { getSession: async () => session, resolveToken: () => token }
}

const instantSleep = () => Promise.resolve()

function makeClient(
  fetcher: typeof fetch,
  opts: { session?: SessionAccessor; refreshToken?: () => Promise<{ accessToken: string } | null> } = {},
) {
  return new FetchApiClient(CONFIG, {
    session: opts.session ?? guestSession(),
    refreshToken: opts.refreshToken,
    logger: noopLogger,
    sleep: instantSleep,
    fetcher,
  })
}

describe('buildApiBaseUrl', () => {
  it('normalizes missing/extra slashes', () => {
    expect(buildApiBaseUrl({ baseUrl: 'https://x.test/api', version: 'v1' }))
      .toBe('https://x.test/api/v1')
    expect(buildApiBaseUrl({ baseUrl: 'https://x.test/api/', version: 'v1' }))
      .toBe('https://x.test/api/v1')
    expect(buildApiBaseUrl({ baseUrl: 'https://x.test/api', version: '/v1/' }))
      .toBe('https://x.test/api/v1')
    expect(buildApiBaseUrl({ baseUrl: 'https://x.test/api', version: '' }))
      .toBe('https://x.test/api')
  })
})

describe('FetchApiClient', () => {
  it('builds the request URL as baseUrl + version + path + query', async () => {
    let seenUrl = ''
    const client = makeClient((async (input: unknown) => {
      seenUrl = String(input)
      return jsonResponse(200, [])
    }) as typeof fetch)

    const res = await client.request({
      method: 'GET',
      path: '/albums',
      query: { page: 0, limit: 20, empty: '' },
    })
    expect(res.ok).toBe(true)
    expect(seenUrl).toBe('https://api.example.com/api/v1/albums?page=0&limit=20')
  })

  it('injects Authorization only when the session resolves a token', async () => {
    const seen: Array<string | null> = []
    const fetcher = (async (_input: unknown, init?: RequestInit) => {
      seen.push(new Headers(init?.headers).get('authorization'))
      return jsonResponse(200, {})
    }) as typeof fetch

    await makeClient(fetcher, { session: authedSession('tok-123') })
      .request({ method: 'GET', path: '/users/me' })
    await makeClient(fetcher, { session: guestSession() })
      .request({ method: 'GET', path: '/users/me' })

    expect(seen).toEqual(['Bearer tok-123', null])
  })

  it('dedupes concurrent identical GET requests (one fetch, shared result)', async () => {
    let calls = 0
    const client = makeClient((async () => {
      calls++
      // Hold the response briefly so both requests overlap in flight.
      await new Promise((r) => setTimeout(r, 20))
      return jsonResponse(200, { n: calls })
    }) as typeof fetch)

    const [a, b] = await Promise.all([
      client.request({ method: 'GET', path: '/stats' }),
      client.request({ method: 'GET', path: '/stats' }),
    ])
    expect(calls).toBe(1)
    expect(a.ok && b.ok && a.data).toEqual(b.ok ? b.data : null)
  })

  it('does NOT dedupe non-GET requests', async () => {
    let calls = 0
    const client = makeClient((async () => {
      calls++
      return jsonResponse(200, { ok: true })
    }) as typeof fetch)

    await Promise.all([
      client.request({ method: 'POST', path: '/albums', body: {} }),
      client.request({ method: 'POST', path: '/albums', body: {} }),
    ])
    expect(calls).toBe(2)
  })

  it('retries retryable GET statuses up to max, then succeeds', async () => {
    let calls = 0
    const client = makeClient((async () => {
      calls++
      return calls < 3 ? jsonResponse(500, { message: 'boom' }) : jsonResponse(200, { fine: true })
    }) as typeof fetch)

    const res = await client.request({ method: 'GET', path: '/albums' })
    expect(calls).toBe(3)
    expect(res.ok).toBe(true)
  })

  it('returns the failure after exhausting retries', async () => {
    let calls = 0
    const client = makeClient((async () => {
      calls++
      return jsonResponse(503, { message: 'down' })
    }) as typeof fetch)

    const res = await client.request({ method: 'GET', path: '/albums' })
    expect(calls).toBe(3) // 1 initial + 2 retries
    expect(res.ok).toBe(false)
    if (!res.ok) expect(res.error.code).toBe('transport')
  })

  it('never retries non-GET methods, even on 5xx', async () => {
    let calls = 0
    const client = makeClient((async () => {
      calls++
      return jsonResponse(500, { message: 'boom' })
    }) as typeof fetch)

    const res = await client.request({ method: 'DELETE', path: '/albums/x' })
    expect(calls).toBe(1)
    expect(res.ok).toBe(false)
  })

  it('never retries client errors like 400/404', async () => {
    let calls = 0
    const client = makeClient((async () => {
      calls++
      return jsonResponse(404, { message: 'nope' })
    }) as typeof fetch)

    const res = await client.request({ method: 'GET', path: '/albums/nope' })
    expect(calls).toBe(1)
    expect(res.ok).toBe(false)
    if (!res.ok) expect(res.error.code).toBe('not_found')
  })

  it('on 401: refreshes once, retries with the new token', async () => {
    const seenAuth: Array<string | null> = []
    let calls = 0
    const fetcher = (async (_input: unknown, init?: RequestInit) => {
      calls++
      seenAuth.push(new Headers(init?.headers).get('authorization'))
      return calls === 1 ? jsonResponse(401, { message: 'expired' }) : jsonResponse(200, { ok: 1 })
    }) as typeof fetch

    let refreshes = 0
    // After a successful refresh the in-memory token is swapped — the
    // session accessor must therefore resolve the NEW token on retry.
    // Simulated here by flipping on the refreshes counter.
    const client = new FetchApiClient(CONFIG, {
      session: {
        getSession: async () => null,
        resolveToken: () => (refreshes > 0 ? 'new-token' : 'old-token'),
      },
      refreshToken: async () => {
        refreshes++
        return { accessToken: 'new-token' }
      },
      logger: noopLogger,
      sleep: instantSleep,
      fetcher,
    })

    const res = await client.request({ method: 'GET', path: '/users/me' })
    expect(res.ok).toBe(true)
    expect(refreshes).toBe(1)
    expect(calls).toBe(2)
    expect(seenAuth).toEqual(['Bearer old-token', 'Bearer new-token'])
  })

  it('on 401 with a failing refresh: returns the 401 without retrying', async () => {
    let calls = 0
    const client = makeClient(
      (async () => {
        calls++
        return jsonResponse(401, { message: 'expired' })
      }) as typeof fetch,
      { refreshToken: async () => null },
    )

    const res = await client.request({ method: 'GET', path: '/users/me' })
    expect(res.ok).toBe(false)
    if (!res.ok) expect(res.error.code).toBe('unauthorized')
    expect(calls).toBe(1)
  })

  it('maps a network failure to a transport error (with retry)', async () => {
    let calls = 0
    const client = makeClient((async () => {
      calls++
      throw new TypeError('Failed to fetch')
    }) as typeof fetch)

    const res = await client.request({ method: 'GET', path: '/albums' })
    expect(res.ok).toBe(false)
    if (!res.ok) expect(res.error.code).toBe('transport')
    expect(calls).toBe(3) // network failure IS retryable for GET
  })

  it('aborts a hanging request after timeoutMs', async () => {
    const fastClient = new FetchApiClient(
      { ...CONFIG, timeoutMs: 10 },
      {
        session: guestSession(),
        logger: noopLogger,
        sleep: instantSleep,
        fetcher: ((input: unknown, init?: RequestInit) =>
          new Promise<Response>((_resolve, reject) => {
            init?.signal?.addEventListener('abort', () => {
              reject(new DOMException('The operation was aborted.', 'AbortError'))
            })
          })) as typeof fetch,
      },
    )

    const res = await fastClient.request({ method: 'POST', path: '/slow', body: {} })
    expect(res.ok).toBe(false)
    if (!res.ok) expect(res.error.code).toBe('transport')
  }, 5_000)
})
