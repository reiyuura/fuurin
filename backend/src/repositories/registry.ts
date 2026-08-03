/**
 * Repository registry — single point of construction.
 *
 * Sprint 18 services depend on the `Repositories` interface below;
 * never on Prisma or any concrete repository class.
 *
 * The registry is built once at app startup with a shared PrismaClient
 * (the Sprint 16 singleton). Tests can construct a parallel registry
 * against a fresh client.
 */

import type { PrismaClient } from '@prisma/client'
import { PrismaAlbumRepository } from './prisma-album-repository'
import { PrismaMediaRepository } from './prisma-media-repository'
import { PrismaUserRepository } from './prisma-user-repository'
import { PrismaUploadRepository } from './prisma-upload-repository'
import type { AlbumRepository } from './album-repository'
import type { MediaRepository } from './media-repository'
import type { UserRepository } from './user-repository'
import type { UploadRepository } from './upload-repository'

export type Repositories = {
  albums: AlbumRepository
  media: MediaRepository
  users: UserRepository
  uploads: UploadRepository
}

export function createPrismaRepositories(prisma: PrismaClient): Repositories {
  return {
    albums: new PrismaAlbumRepository(prisma),
    media: new PrismaMediaRepository(prisma),
    users: new PrismaUserRepository(prisma),
    uploads: new PrismaUploadRepository(prisma),
  }
}