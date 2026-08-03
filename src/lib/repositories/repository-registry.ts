/**
 * Repository Registry — single facade.
 *
 * Per REQUIRED REFINEMENT #1 the registry does NOT instantiate the
 * ApiClient; it receives it from `apiClient` (the provider module).
 * Sprint 14 swaps the provider; the registry is untouched.
 *
 * Per REQUIRED REFINEMENT #3 the registry only exposes domain-shaped
 * repositories. DTOs stay inside the repositories folder.
 */

import { apiClient } from './api-client-provider'
import { MockAlbumRepository } from './mock-album-repository'
import { MockMediaRepository } from './mock-media-repository'
import { MockUploadRepository } from './mock-upload-repository'
import { MockUserRepository } from './mock-user-repository'
import type { AlbumRepository } from './album-repository'
import type { MediaRepository } from './media-repository'
import type { UploadRepository } from './upload-repository'
import type { UserRepository } from './user-repository'

export interface RepositoryRegistry {
  readonly albums: AlbumRepository
  readonly media: MediaRepository
  readonly uploads: UploadRepository
  readonly users: UserRepository
}

export const repositories: RepositoryRegistry = {
  albums: new MockAlbumRepository(apiClient),
  media: new MockMediaRepository(apiClient),
  uploads: new MockUploadRepository(apiClient),
  users: new MockUserRepository(apiClient),
}

export type { AlbumRepository, MediaRepository, UploadRepository, UserRepository }
