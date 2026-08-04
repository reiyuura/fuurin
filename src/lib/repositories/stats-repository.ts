/**
 * StatsRepository — public read-only stats (Sprint 20D).
 */

import type { ApiClient, ApiResponse } from './api-client'

export type StatsSummary = {
  totalAlbums: number
  totalPhotos: number
  totalMembers: number
  totalTimelineEntries: number
}

export interface StatsRepository {
  getStats(): Promise<ApiResponse<StatsSummary>>
}

export class FetchStatsRepository implements StatsRepository {
  constructor(private readonly api: ApiClient) {}

  async getStats(): Promise<ApiResponse<StatsSummary>> {
    return this.api.request<StatsSummary>({ method: 'GET', path: '/stats' })
  }
}