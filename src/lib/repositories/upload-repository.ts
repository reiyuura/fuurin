/**
 * UploadRepository — file upload over multipart/form-data.
 *
 * Sprint 20C: wraps FormData → POST /uploads. The token is injected
 * by FetchApiClient via the SessionAccessor (Bearer header).
 */

import type { ApiClient, ApiResponse } from './api-client'

export type UploadResult = {
  key: string
  url: string
  sizeBytes: number
  contentType: string
}

export interface UploadRepository {
  upload(file: File): Promise<ApiResponse<UploadResult>>
}

export class FetchUploadRepository implements UploadRepository {
  constructor(private readonly api: ApiClient) {}

  async upload(file: File): Promise<ApiResponse<UploadResult>> {
    const form = new FormData()
    form.append('file', file)
    const res = await this.api.request<UploadResult>({
      method: 'POST',
      path: '/uploads',
      body: form as unknown as Record<string, unknown>,
      headers: {
        // Let fetch set Content-Type with boundary for FormData.
        'Content-Type': 'multipart/form-data',
      },
    } as never)
    return res
  }
}