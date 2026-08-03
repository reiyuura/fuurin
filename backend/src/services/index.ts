/**
 * Services — reads composition root for the READ API.
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

export type Services = {
  albums: AlbumService
  media: MediaService
  members: MemberService
  search: SearchService
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
  }
}