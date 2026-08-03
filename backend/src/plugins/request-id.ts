/**
 * request-id — correlate backend logs with the client's `X-Request-Id`,
 * generating a fallback when the client omits it. The id is echoed on
 * the response `X-Request-Id` header so the frontend `FetchApiClient`
 * can correlate (see ApiResponseMeta.requestId).
 *
 * Applied directly to the root Fastify instance (not via a registered
 * plugin) so every route inherits the hook regardless of registration
 * scope.
 */

import type { FastifyInstance } from 'fastify'

const ID_ALPHABET = '0123456789abcdefghijklmnopqrstuvwxyz'

function makeFallbackId(): string {
  let out = ''
  for (let i = 0; i < 12; i++) {
    out += ID_ALPHABET[Math.floor(Math.random() * ID_ALPHABET.length)]
  }
  return out
}

/** Augment FastifyRequest/Reply with `requestId`. */
declare module 'fastify' {
  interface FastifyRequest {
    requestId: string
  }
}

export function configureRequestId(app: FastifyInstance): void {
  app.addHook('onRequest', async (request, reply) => {
    const incoming = request.headers['x-request-id']
    const requestId = typeof incoming === 'string' && incoming ? incoming : makeFallbackId()
    request.requestId = requestId
    reply.header('X-Request-Id', requestId)
    request.log = request.log.child({ requestId })
  })
}