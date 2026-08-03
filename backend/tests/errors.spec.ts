/**
 * Error contract tests — status-code parity with the frontend
 * `error-mapper.ts` (STATUS_TO_CODE). The backend must map HTTP
 * statuses to repository error codes identically, and emit the
 * `{ message }` JSON body the frontend `response-parser.ts` reads.
 */

import { describe, expect, it } from 'vitest'
import { ApiError, CODE_TO_STATUS, STATUS_TO_CODE, toErrorBody } from '../src/shared/errors'

// Mirror of frontend STATUS_TO_CODE in src/lib/api/error-mapper.ts
const FRONTEND_STATUS_TO_CODE: Record<number, string> = {
  400: 'validation',
  401: 'unauthorized',
  403: 'forbidden',
  404: 'not_found',
  409: 'conflict',
  422: 'validation',
  429: 'transport',
}

describe('error contract parity', () => {
  it('backend STATUS_TO_CODE matches frontend for every mapped status', () => {
    for (const [status, code] of Object.entries(FRONTEND_STATUS_TO_CODE)) {
      expect(STATUS_TO_CODE[Number(status)], `status ${status}`).toBe(code)
    }
  })

  it('5xx maps to transport like the frontend', () => {
    expect(ApiError.fromStatus(500, 'x').code).toBe('transport')
    expect(ApiError.fromStatus(503, 'x').code).toBe('transport')
  })

  it('unknown 4xx maps to unknown', () => {
    expect(ApiError.fromStatus(418, 'x').code).toBe('unknown')
  })

  it('explicit code resolves to its canonical status', () => {
    expect(CODE_TO_STATUS.validation).toBe(400)
    expect(CODE_TO_STATUS.unauthorized).toBe(401)
    expect(CODE_TO_STATUS.forbidden).toBe(403)
    expect(CODE_TO_STATUS.not_found).toBe(404)
    expect(CODE_TO_STATUS.conflict).toBe(409)
  })

  it('error body is { message, code } — the field the frontend reads', () => {
    const err = new ApiError('not_found', 'Album tidak ditemukan.')
    const body = toErrorBody(err)
    expect(body.message).toBe('Album tidak ditemukan.')
    expect(body.code).toBe('not_found')
    expect(body.details).toBeUndefined()
  })
})