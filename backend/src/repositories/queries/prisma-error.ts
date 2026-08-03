/**
 * Prisma error mapper — the single place that converts Prisma-thrown
 * errors into `Result<T>` errors. Repositories wrap every Prisma call
 * in `safe()`; the mapper knows the Prisma error code semantics.
 *
 * Parity with the frontend `error-mapper.ts`:
 *   P2002 (unique violation)   → conflict
 *   P2025 (not found)          → not_found (gets ok(null) treatment at call site)
 *   P2003 (FK constraint)      → conflict
 *   P2009/P2010/P2011/P2012    → validation
 *   everything else            → unknown
 */

import { Prisma } from '@prisma/client'
import { err, ok, type RepositoryError, type Result } from '../../shared/result'

export function isPrismaKnownRequestError(e: unknown): e is Prisma.PrismaClientKnownRequestError {
  return e instanceof Prisma.PrismaClientKnownRequestError
}

export function mapPrismaError(e: unknown): RepositoryError {
  if (isPrismaKnownRequestError(e)) {
    const code = e.code
    const meta = e.meta as Record<string, unknown> | undefined
    switch (code) {
      case 'P2002':
        return { code: 'conflict', message: 'Data sudah ada (duplikat).', cause: { prismaCode: code, meta } }
      case 'P2025':
        return { code: 'not_found', message: 'Data tidak ditemukan.', cause: { prismaCode: code } }
      case 'P2003':
        return { code: 'conflict', message: 'Referensi data tidak valid.', cause: { prismaCode: code, meta } }
      case 'P2009':
      case 'P2010':
      case 'P2011':
      case 'P2012':
        return { code: 'validation', message: 'Data tidak valid.', cause: { prismaCode: code, meta } }
      case 'P2034':
        return { code: 'conflict', message: 'Konflik tulis (serializable).', cause: { prismaCode: code } }
      default:
        return { code: 'unknown', message: 'Terjadi kesalahan basis data.', cause: { prismaCode: code, meta } }
    }
  }
  if (e instanceof Prisma.PrismaClientValidationError) {
    return { code: 'validation', message: 'Permintaan tidak valid.', cause: e.message }
  }
  const message = e instanceof Error ? e.message : String(e)
  return { code: 'unknown', message: 'Terjadi kesalahan tak terduga.', cause: { message } }
}

/**
 * Wrap a Prisma call, returning a `Result<T>`. Repositories use this for
 * read methods that surface `T | null`.
 */
export async function safe<T>(fn: () => Promise<T>): Promise<Result<T>> {
  try {
    return ok(await fn())
  } catch (e) {
    return err(mapPrismaError(e).code, mapPrismaError(e).message, e)
  }
}

/**
 * Wrap a Prisma call returning a single row, mapping `P2025` to
 * `ok(null)` so callers can treat "not found" as a regular case.
 */
export async function safeFind<T>(fn: () => Promise<T | null>): Promise<Result<T | null>> {
  try {
    const value = await fn()
    return ok(value)
  } catch (e) {
    if (isPrismaKnownRequestError(e) && e.code === 'P2025') {
      return ok(null)
    }
    const mapped = mapPrismaError(e)
    return err(mapped.code, mapped.message, e)
  }
}