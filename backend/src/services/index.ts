/**
 * Services — composition root for the READ + WRITE APIs.
 *
 * Builds every service from a `Repositories` set (the Sprint 17
 * registry). Controllers/routes depend on these service singletons;
 * they never see Prisma or repository impls directly.
 */

import type { Repositories } from '../repositories/registry'
import { createAlbumService, type AlbumService } from './album-service'
import { createMediaService, type MediaService } from './media-service'
import { createMemberService, type MemberService } from './member-service'
import { createSearchService, type SearchService } from './search-service'
import { createWriteService, type WriteService } from './write-service'

export type Services = {
  albums: AlbumService
  media: MediaService
  members: MemberService
  search: SearchService
  writes: WriteService
}

export function createServices(repos: Repositories): Services {
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
      // Without auth, album ownership falls back to the seeded admin
      // (first user row). Composition root only — services stay
      // Prisma-free; the resolver is injected here.
      resolveDefaultOwner: async () => {
        const id = await repos.firstUserId()
        if (!id) throw new Error('no user seeded')
        return id
      },
    }),
  }
}