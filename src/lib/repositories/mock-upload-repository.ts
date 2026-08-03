/**
 * MockUploadRepository — persists upload records via ApiClient.
 */

import type { ApiClient } from './api-client'
import type { UploadDto } from '@/types/repository-dtos'
import { toUpload } from './dto-mappers'
import { err, ok } from './result-helpers'
import type { RepositoryResult } from './result-helpers'
import type { Upload, UploadInput, UploadRepository } from './upload-repository'

export class MockUploadRepository implements UploadRepository {
  constructor(private readonly api: ApiClient) {}

  async list(): Promise<RepositoryResult<Upload[]>> {
    const res = await this.api.request<UploadDto[]>({ method: 'GET', path: '/uploads' })
    if (!res.ok) return err<Upload[]>(res.error.code, res.error.message)
    return ok(res.data.map(toUpload))
  }

  async record(input: UploadInput): Promise<RepositoryResult<Upload>> {
    const body: UploadDto = {
      ...input,
      createdAt: new Date().toISOString(),
    }
    const res = await this.api.request<UploadDto>({
      method: 'POST',
      path: '/uploads',
      body,
    })
    if (!res.ok) return err<Upload>(res.error.code, res.error.message)
    return ok(toUpload(res.data))
  }

  async remove(id: string): Promise<RepositoryResult<void>> {
    const res = await this.api.request<{ id: string }>({
      method: 'DELETE',
      path: `/uploads/${encodeURIComponent(id)}`,
    })
    if (!res.ok) return err<void>(res.error.code, res.error.message)
    return ok(undefined)
  }

  async clear(): Promise<RepositoryResult<void>> {
    const res = await this.api.request<{ cleared: boolean }>({
      method: 'DELETE',
      path: '/uploads',
    })
    if (!res.ok) return err<void>(res.error.code, res.error.message)
    return ok(undefined)
  }
}
