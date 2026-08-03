/**
 * PrismaUploadRepository — Prisma-backed implementation of `UploadRepository`.
 *
 * Persistence only. The actual upload pipeline (worker, progress, retries)
 * is a Sprint 20 concern that sits on top of this repository.
 */

import type { PrismaClient } from '@prisma/client'
import type { UploadRepository } from './upload-repository'
import type { Result } from '../shared/result'
import { ok } from '../shared/result'
import type { Upload, UploadInput } from '../domain/models'
import { toUpload } from './mappers/prisma-to-domain'
import { buildOrderBy } from './queries/sort'
import { safe } from './queries/prisma-error'

export class PrismaUploadRepository implements UploadRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async list(): Promise<Result<Upload[]>> {
    const rows = await safe(async () =>
      this.prisma.uploadRecord.findMany({ orderBy: buildOrderBy('upload') }),
    )
    if (!rows.ok) return rows
    return ok(rows.value.map(toUpload))
  }

  async record(input: UploadInput): Promise<Result<Upload>> {
    const row = await safe(async () =>
      this.prisma.uploadRecord.create({
        data: {
          id: input.id,
          fileName: input.fileName,
          sizeBytes: input.sizeBytes,
          mimeType: input.mimeType,
          status: input.status,
          progress: input.progress,
          createdAt: new Date(),
          completedAt: input.completedAt ? new Date(input.completedAt) : null,
          errorMessage: input.errorMessage ?? null,
        },
      }),
    )
    if (!row.ok) return row
    return ok(toUpload(row.value))
  }

  async remove(id: string): Promise<Result<void>> {
    try {
      await this.prisma.uploadRecord.delete({ where: { id } })
      return ok(undefined)
    } catch {
      // Idempotent: missing id is not an error for a remove operation.
      return ok(undefined)
    }
  }

  async clear(): Promise<Result<void>> {
    await safe(async () => this.prisma.uploadRecord.deleteMany({}))
    return ok(undefined)
  }
}