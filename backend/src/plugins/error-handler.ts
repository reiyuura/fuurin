/**
 * Global error handler — converts every thrown error into the stable
 * `{ message, code, details? }` envelope with the correct status.
 *
 * Applied directly to the root Fastify instance (NOT via a registered
 * plugin) so every route — including ones registered at the root scope
 * after this call — inherits it.
 *
 * Parity with the frontend `error-mapper.ts`:
 *   ApiError            → its code/status
 *   Fastify validation  → 400 `validation`
 *   unexpected          → 500 `transport` (logged as error)
 */

import type { FastifyInstance } from 'fastify'
import { ApiError } from '../shared/errors'
import { toErrorBody } from '../shared/errors'

export function configureErrorHandler(app: FastifyInstance): void {
  app.setErrorHandler((error, request, reply) => {
    const requestId = request.requestId

    if (error instanceof ApiError) {
      request.log.warn({ requestId, code: error.code }, error.message)
      return reply.status(error.status).send(toErrorBody(error))
    }

    // Fastify validation error → 400 / 422 (`validation`).
    const validationError = error as { validation?: { message: string }[] }
    if (validationError.validation?.length) {
      const details = validationError.validation.map((v) => v.message)
      const apiErr = ApiError.fromStatus(400, 'Permintaan tidak valid.', details)
      return reply.status(apiErr.status).send(toErrorBody(apiErr))
    }

    // Unknown → 500 `transport`, logged as an error.
    request.log.error({ requestId, err: error }, 'Unhandled error')
    const apiErr = ApiError.fromStatus(500, 'Gagal memproses permintaan.')
    return reply.status(apiErr.status).send(toErrorBody(apiErr))
  })

  // Not-found handler — emit the same `{ message, code }` envelope so
  // the frontend `response-parser` can map it to `not_found`.
  app.setNotFoundHandler((request, reply) => {
    request.log.warn({ requestId: request.requestId, method: request.method, url: request.url }, 'Route not found')
    const apiErr = ApiError.fromStatus(404, 'Rute tidak ditemukan.')
    void reply.status(apiErr.status).send(toErrorBody(apiErr))
  })
}