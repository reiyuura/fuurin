/**
 * StatsRepository — Prisma-backed aggregation (Sprint 20D).
 */

import type { PrismaClient } from '@prisma/client'
import { ok, type Result } from '../shared/result'
import { safe } from '../repositories/queries/prisma-error'
import type { StatsSummary } from '../domain/auth'

export class StatsRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async getStats(): Promise<Result<StatsSummary>> {
    const [albums, photos, members, timeline] = await Promise.all([
      safe(() => this.prisma.album.count({ where: { deletedAt: null } })),
      safe(() => this.prisma.photo.count()),
      safe(() => this.prisma.member.count()),
      safe(() => this.prisma.timelineEntry.count()),
    ])

    // All counts should succeed; if any fails, surface it.
    if (!albums.ok) return albums
    if (!photos.ok) return photos
    if (!members.ok) return members
    if (!timeline.ok) return timeline

    return ok({
      totalAlbums: albums.value,
      totalPhotos: photos.value,
      totalMembers: members.value,
      totalTimelineEntries: timeline.value,
    })
  }
}