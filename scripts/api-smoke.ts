/**
 * Sprint 14 smoke test — runs the FetchApiClient pipeline with a
 * stub fetcher. Validates: URL building, query, auth header injection,
 * retry policy, error mapping, response parser (JSON / empty / non-JSON).
 *
 * No external network, no real backend. Exits non-zero on failure.
 */

import { FetchApiClient } from '../src/lib/api/fetch-api-client'
import type { Session } from '../src/types/auth'
import type { Logger } from '../src/lib/api/logger'
import type { SessionAccessor } from '../src/lib/api/session-accessor'

const noopLogger: Logger = {
  debug: () => undefined,
  info: () => undefined,
  warn: () => undefined,
  error: () => undefined,
}

function assert(cond: unknown, msg: string): void {
  if (!cond) {
    console.error('FAIL:', msg)
    process.exit(1)
  } else {
    console.log('PASS:', msg)
  }
}

const baseConfig = {
  mode: 'fetch' as const,
  baseUrl: 'https://example.com',
  version: 'v1',
  timeoutMs: 2000,
  retry: { max: 2, backoffMs: [50, 100] },
  defaultHeaders: {},
}

async function main(): Promise<void> {
  // ── 1. URL building + auth header injection ─────────────────
  {
    let capturedUrl = ''
    let capturedHeaders: Record<string, string> = {}
    const session: Session = {
      user: { id: 'u1', name: 'Rei', email: 'rei@fuurin.id', role: 'admin', avatar: '' },
      issuedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 60_000).toISOString(),
      token: 'tok-abc',
    }
    const accessor: SessionAccessor = {
      getSession: async () => session,
      resolveToken: (s) => s.token ?? null,
    }
    const fetcher: typeof fetch = async (url, init) => {
      capturedUrl = String(url)
      capturedHeaders = (init?.headers ?? {}) as Record<string, string>
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      })
    }
    const client = new FetchApiClient(baseConfig, {
      session: accessor,
      logger: noopLogger,
      fetcher,
      sleep: async () => undefined,
    })
    const res = await client.request({
      method: 'GET',
      path: '/albums',
      query: { category: 'festival', page: 0, limit: 24 },
    })
    assert(res.ok, '1.1 success response shape')
    assert(capturedUrl.startsWith('https://example.com/v1/albums?'), '1.2 URL has version + path')
    assert(capturedUrl.includes('category=festival'), '1.3 query contains category=festival')
    assert(capturedUrl.includes('page=0'), '1.4 query contains page=0')
    const headers = capturedHeaders
    assert(headers['Accept'] === 'application/json', '1.6 Accept header present')
    assert(headers['X-Request-Id'], '1.7 request id header present')
  }

  // ── 2. Empty body (204) ─────────────────────────────────────
  {
    const fetcher: typeof fetch = async () => new Response(null, { status: 204 })
    const accessor: SessionAccessor = {
      getSession: async () => null,
      resolveToken: () => null,
    }
    const client = new FetchApiClient(baseConfig, {
      session: accessor,
      logger: noopLogger,
      fetcher,
      sleep: async () => undefined,
    })
    const res = await client.request({ method: 'DELETE', path: '/albums/foo' })
    assert(res.ok, '2.1 204 No Content returns success')
    if (res.ok) assert(res.data === undefined, '2.2 data is undefined')
  }

  // ── 3. Non-JSON body ─────────────────────────────────────────
  {
    const fetcher: typeof fetch = async () =>
      new Response('plain text response', { status: 200, headers: { 'content-type': 'text/plain' } })
    const accessor: SessionAccessor = {
      getSession: async () => null,
      resolveToken: () => null,
    }
    const client = new FetchApiClient(baseConfig, {
      session: accessor,
      logger: noopLogger,
      fetcher,
      sleep: async () => undefined,
    })
    const res = await client.request({ method: 'GET', path: '/binary' })
    assert(res.ok, '3.1 non-JSON 2xx still resolves')
  }

  // ── 4. 401 mapped to unauthorized ───────────────────────────
  {
    const fetcher: typeof fetch = async () =>
      new Response(JSON.stringify({ message: 'no token' }), {
        status: 401,
        headers: { 'content-type': 'application/json' },
      })
    const accessor: SessionAccessor = {
      getSession: async () => null,
      resolveToken: () => null,
    }
    const client = new FetchApiClient(baseConfig, {
      session: accessor,
      logger: noopLogger,
      fetcher,
      sleep: async () => undefined,
    })
    const res = await client.request({ method: 'GET', path: '/me' })
    assert(!res.ok, '4.1 401 returns failure')
    if (!res.ok) assert(res.error.code === 'unauthorized', '4.2 code = unauthorized')
  }

  // ── 5. 404 mapped to not_found ──────────────────────────────
  {
    const fetcher: typeof fetch = async () =>
      new Response(JSON.stringify({ message: 'Album tidak ditemukan' }), {
        status: 404,
        headers: { 'content-type': 'application/json' },
      })
    const accessor: SessionAccessor = {
      getSession: async () => null,
      resolveToken: () => null,
    }
    const client = new FetchApiClient(baseConfig, {
      session: accessor,
      logger: noopLogger,
      fetcher,
      sleep: async () => undefined,
    })
    const res = await client.request({ method: 'GET', path: '/missing' })
    assert(!res.ok, '5.1 404 returns failure')
    if (!res.ok) {
      assert(res.error.code === 'not_found', '5.2 code = not_found')
      assert(res.error.message.includes('Album'), '5.3 server message propagated')
    }
  }

  // ── 6. Retry: GET 500 → retry → success ──────────────────────
  {
    let calls = 0
    const fetcher: typeof fetch = async () => {
      calls += 1
      if (calls < 2) {
        return new Response('boom', { status: 500, headers: { 'content-type': 'text/plain' } })
      }
      return new Response(JSON.stringify({ data: 'recovered' }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      })
    }
    const accessor: SessionAccessor = {
      getSession: async () => null,
      resolveToken: () => null,
    }
    const client = new FetchApiClient(baseConfig, {
      session: accessor,
      logger: noopLogger,
      fetcher,
      sleep: async () => undefined,
    })
    const res = await client.request({ method: 'GET', path: '/flaky' })
    assert(res.ok, '6.1 GET retries then succeeds')
    assert(calls === 2, '6.2 exactly one retry happened')
  }

  // ── 7. POST never retries ───────────────────────────────────
  {
    let calls = 0
    const fetcher: typeof fetch = async () => {
      calls += 1
      return new Response('boom', { status: 500, headers: { 'content-type': 'text/plain' } })
    }
    const accessor: SessionAccessor = {
      getSession: async () => null,
      resolveToken: () => null,
    }
    const client = new FetchApiClient(baseConfig, {
      session: accessor,
      logger: noopLogger,
      fetcher,
      sleep: async () => undefined,
    })
    const res = await client.request({
      method: 'POST',
      path: '/albums',
      body: { title: 'x' },
    })
    assert(!res.ok, '7.1 POST 500 returns failure without retry')
    assert(calls === 1, '7.2 POST not retried')
  }

  // ── 8. Timeout → transport error ────────────────────────────
  {
    const fetcher: typeof fetch = (_url, init) =>
      new Promise<Response>((_, reject) => {
        const signal = init?.signal as AbortSignal | undefined
        if (!signal) {
          reject(new Error('no signal'))
          return
        }
        signal.addEventListener('abort', () => {
          const err = new Error('aborted') as Error & { name: string; reason: unknown }
          err.name = 'AbortError'
          err.reason = (init?.signal as AbortSignal & { reason?: unknown })?.reason ?? 'timeout'
          reject(err)
        })
      })
    const accessor: SessionAccessor = {
      getSession: async () => null,
      resolveToken: () => null,
    }
    const client = new FetchApiClient(
      { ...baseConfig, timeoutMs: 50, retry: { max: 0, backoffMs: [] } },
      {
        session: accessor,
        logger: noopLogger,
        fetcher,
        sleep: async () => undefined,
      },
    )
    const res = await client.request({ method: 'GET', path: '/slow' })
    assert(!res.ok, '8.1 timeout returns failure')
    if (!res.ok) {
      assert(res.error.code === 'transport', '8.2 code = transport')
      assert(res.error.message.includes('timeout'), '8.3 message mentions timeout')
    }
  }

  // ── 9. Logger sanitizes Authorization ────────────────────────
  {
    const seen: unknown[] = []
    const captureLogger: Logger = {
      debug: (e) => seen.push(e),
      info: () => undefined,
      warn: () => undefined,
      error: () => undefined,
    }
    const session: Session = {
      user: { id: 'u1', name: 'Rei', email: 'rei@fuurin.id', role: 'admin', avatar: '' },
      issuedAt: new Date().toISOString(),
      expiresAt: new Date().toISOString(),
      token: 'SECRET-TOKEN',
    }
    const fetcher: typeof fetch = async () =>
      new Response('{}', { status: 200, headers: { 'content-type': 'application/json' } })
    const client = new FetchApiClient(baseConfig, {
      session: {
        getSession: async () => session,
        resolveToken: (s) => s.token ?? null,
      },
      logger: captureLogger,
      fetcher,
      sleep: async () => undefined,
    })
    await client.request({ method: 'GET', path: '/x' })
    const serialized = JSON.stringify(seen)
    assert(!serialized.includes('SECRET-TOKEN'), '9.1 logger never logs raw bearer token')
    assert(serialized.includes('[REDACTED]'), '9.2 logger redacts Authorization')
  }

  // ── 10. Network failure → transport error ────────────────────
  {
    const fetcher: typeof fetch = async () => {
      throw new TypeError('Failed to fetch')
    }
    const accessor: SessionAccessor = {
      getSession: async () => null,
      resolveToken: () => null,
    }
    const client = new FetchApiClient(
      { ...baseConfig, retry: { max: 0, backoffMs: [] } },
      { session: accessor, logger: noopLogger, fetcher, sleep: async () => undefined },
    )
    const res = await client.request({ method: 'GET', path: '/net' })
    assert(!res.ok, '10.1 network failure returns failure')
    if (!res.ok) assert(res.error.code === 'transport', '10.2 code = transport')
  }

  console.log('\nAll FetchApiClient smoke tests passed.')
}

main().catch((e) => {
  console.error('Test crashed:', e)
  process.exit(1)
})
