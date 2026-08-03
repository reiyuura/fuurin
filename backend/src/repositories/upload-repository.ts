/**
 * UploadRepository — interface (domain only). Prisma-free.
 *
 * Mirrors the frontend `UploadRepository` (`src/lib/repositories/upload-repository.ts`).
 * Persistence only; the transfer pipeline is a client/feature concern.
 */

import type { Result } from '../shared/result'
import type { Upload, UploadInput } from '../domain/models'

export interface UploadRepository {
  list(): Promise<Result<Upload[]>>
  record(input: UploadInput): Promise<Result<Upload>>
  remove(id: string): Promise<Result<void>>
  clear(): Promise<Result<void>>
}