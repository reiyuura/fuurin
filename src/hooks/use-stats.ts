/**
 * useStats — public stats from backend (fetch mode) or mock STATS.
 */

'use client'

import { useEffect, useState } from 'react'
import { getEnvironment } from '@/lib/config/env'
import { FetchStatsRepository } from '@/lib/repositories/stats-repository'
import { getApiClient } from '@/lib/repositories/api-client-provider'

export type Stats = {
  members: number
  albums: number
  photos: number
  timelineEntries?: number
}

const MOCK_STATS: Stats = { members: 32, albums: 68, photos: 1248 }

export function useStats(): Stats {
  const [stats, setStats] = useState<Stats>(MOCK_STATS)
  const env = getEnvironment()

  useEffect(() => {
    if (env.apiMode !== 'fetch') return
    const repo = new FetchStatsRepository(getApiClient())
    repo.getStats().then((res) => {
      if (res.ok) {
        setStats({
          members: res.data.totalMembers,
          albums: res.data.totalAlbums,
          photos: res.data.totalPhotos,
        })
      }
    }).catch(() => {
      // Keep mock stats on error.
    })
  }, [env.apiMode])

  return stats
}