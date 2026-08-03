/**
 * Upload Repository — interface (Domain only).
 *
 * Persistence only — the actual upload pipeline (worker, progress)
 * lives in `@/hooks/use-upload-worker`. This repo just stores records.
 */

import type { RepositoryResult } from '@/types/repository'

export type UploadStatus = 'queued' | 'uploading' | 'completed' | 'failed' | 'cancelled'

export type Upload = {
  id: string
  fileName: string
  sizeBytes: number
  mimeType: string
  status: UploadStatus
  progress: number
  createdAt: string
  completedAt?: string
  errorMessage?: string
}

export type UploadInput = Omit<Upload, 'createdAt'>

export interface UploadRepository {
  list(): Promise<RepositoryResult<Upload[]>>
  record(input: UploadInput): Promise<RepositoryResult<Upload>>
  remove(id: string): Promise<RepositoryResult<void>>
  clear(): Promise<RepositoryResult<void>>
}
