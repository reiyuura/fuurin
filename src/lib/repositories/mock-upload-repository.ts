/**
 * MockUploadRepository — no-op upload for mock mode.
 *
 * Sprint 20C: returns a fake success so the UI's upload flows don't
 * crash in mock mode. Real uploads go through FetchUploadRepository.
 */

import type { ApiClient, ApiResponse } from './api-client'
import type { UploadRepository, UploadResult } from './upload-repository'

export class MockUploadRepository implements UploadRepository {
  constructor(private readonly api: ApiClient) {}

  async upload(_file: File): Promise<ApiResponse<UploadResult>> {
    return {
      ok: true as const,
      data: {
        key: 'uploads/mock-placeholder.jpg',
        url: 'https://images.unsplash.com/photo-1500534623283-312aade485b7?auto=format&fit=crop&w=256&q=85',
        sizeBytes: 0,
        contentType: 'image/jpeg',
      },
      meta: { status: 201, headers: {}, durationMs: 0, requestId: 'mock' },
    }
  }
}