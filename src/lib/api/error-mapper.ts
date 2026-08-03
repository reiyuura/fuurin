/**
 * error-mapper — pure: HTTP status + transport cause → RepositoryError.
 *
 * Centralizes the HTTP → RepositoryErrorCode mapping so the parser
 * and the timeout/retry paths stay in sync. No thrown errors leak
 * outside the ApiClient boundary.
 */

import type { RepositoryError, RepositoryErrorCode } from '@/types/repository'

const STATUS_TO_CODE: Record<number, RepositoryErrorCode> = {
  400: 'validation',
  401: 'unauthorized',
  403: 'forbidden',
  404: 'not_found',
  409: 'conflict',
  422: 'validation',
  429: 'transport',
}

const DEFAULT_MESSAGES: Record<RepositoryErrorCode, string> = {
  not_found: 'Data tidak ditemukan.',
  unauthorized: 'Sesi berakhir. Silakan login ulang.',
  forbidden: 'Anda tidak punya akses.',
  validation: 'Permintaan tidak valid.',
  conflict: 'Terjadi konflik data.',
  transport: 'Gagal terhubung ke server.',
  unknown: 'Terjadi kesalahan tak terduga.',
}

export function mapHttpError(status: number, serverMessage?: string): RepositoryError {
  const code = STATUS_TO_CODE[status] ?? (status >= 500 ? 'transport' : 'unknown')
  return {
    code,
    message: serverMessage?.trim() || DEFAULT_MESSAGES[code],
    cause: { status },
  }
}

/** Recognize AbortError from our timeout controller. */
export function isAbortError(cause: unknown): boolean {
  if (!cause || typeof cause !== 'object') return false
  const name = (cause as { name?: string }).name
  const reason = (cause as { reason?: unknown }).reason
  return name === 'AbortError' || reason === 'timeout'
}

/** Map a thrown value (network failure, abort, JSON parse) to Repo error. */
export function mapTransportError(cause: unknown): RepositoryError {
  if (isAbortError(cause)) {
    return {
      code: 'transport',
      message: 'Permintaan timeout.',
      cause: { reason: 'timeout' },
    }
  }
  const message = cause instanceof Error ? cause.message : String(cause)
  // Browser-only: "Failed to fetch", "NetworkError when attempting to fetch resource"
  const lower = message.toLowerCase()
  if (lower.includes('failed to fetch') || lower.includes('networkerror') || lower.includes('load failed')) {
    return {
      code: 'transport',
      message: 'Gagal terhubung ke server.',
      cause,
    }
  }
  return {
    code: 'unknown',
    message: 'Terjadi kesalahan tak terduga.',
    cause,
  }
}

export function isRetryableStatus(status: number | undefined): boolean {
  if (status === undefined) return true // network failure
  return status === 408 || status === 425 || status === 429 || (status >= 500 && status < 600)
}

export const REPO_ERROR_MESSAGES = DEFAULT_MESSAGES
