/**
 * Error model — backend ApiError + status-code mapping.
 *
 * Parity contract with the frontend `error-mapper.ts`:
 *   400/422 → validation
 *   401     → unauthorized
 *   403     → forbidden
 *   404     → not_found
 *   409     → conflict
 *   429     → transport
 *   5xx     → transport
 *
 * Every non-2xx response body is `{ message, code, details? }` — the
 * frontend `response-parser.ts` reads `message`.
 */

import type { RepositoryErrorCode } from './result'

export const STATUS_TO_CODE: Record<number, RepositoryErrorCode> = {
  400: 'validation',
  401: 'unauthorized',
  403: 'forbidden',
  404: 'not_found',
  409: 'conflict',
  422: 'validation',
  429: 'transport',
}

export const CODE_TO_STATUS: Record<RepositoryErrorCode, number> = {
  validation: 400,
  unauthorized: 401,
  forbidden: 403,
  not_found: 404,
  conflict: 409,
  transport: 500,
  unknown: 500,
}

export type ApiErrorDetails = Record<string, unknown> | unknown[]

export class ApiError extends Error {
  readonly status: number
  readonly code: RepositoryErrorCode
  readonly details?: ApiErrorDetails

  constructor(
    code: RepositoryErrorCode,
    message: string,
    details?: ApiErrorDetails,
    options?: { cause?: unknown; status?: number },
  ) {
    super(message, options?.cause ? { cause: options.cause } : undefined)
    this.name = 'ApiError'
    this.code = code
    this.status = options?.status ?? CODE_TO_STATUS[code]
    this.details = details
  }

  static fromStatus(status: number, message: string, details?: ApiErrorDetails): ApiError {
    const code = STATUS_TO_CODE[status] ?? (status >= 500 ? 'transport' : 'unknown')
    return new ApiError(code, message, details, { status })
  }
}

export function toErrorBody(err: ApiError): {
  message: string
  code: RepositoryErrorCode
  details?: ApiErrorDetails
} {
  const body: { message: string; code: RepositoryErrorCode; details?: ApiErrorDetails } = {
    message: err.message,
    code: err.code,
  }
  if (err.details !== undefined) body.details = err.details
  return body
}
