/**
 * Services — composition root for the READ + WRITE APIs + Auth.
 *
 * Sprint 20B: audit service injected into WriteService so every
 * successful mutation leaves an audit trail.
 */

import type { Repositories } from '../repositories/registry'
import { getPrisma } from '../database/prisma'
import { createAlbumService, type AlbumService } from './album-service'
import { createMediaService, type MediaService } from './media-service'
import { createMemberService, type MemberService } from './member-service'
import { createSearchService, type SearchService } from './search-service'
import { AuditService } from './audit-service'
import { createWriteService, type WriteService } from './write-service'

export type Services = {
  albums: AlbumService
  media: MediaService
  members: MemberService
  search: SearchService
  writes: WriteService
}

export function createServices(repos: Repositories): Services {
  const audit = new AuditService(getPrisma())

  return {
    albums: createAlbumService({ albums: repos.albums }),
    media: createMediaService({ media: repos.media }),
    members: createMemberService({ users: repos.users }),
    search: createSearchService({
      albums: repos.albums,
      media: repos.media,
      users: repos.users,
    }),
    writes: createWriteService({
      readAlbums: repos.albums,
      albums: repos.writes,
      media: repos.writes,
      timeline: repos.writes,
      members: repos.writes,
      resolveDefaultOwner: async () => {
        const id = await repos.firstUserId()
        if (!id) throw new Error('no user seeded')
        return id
      },
      audit,
    }),
  }
}