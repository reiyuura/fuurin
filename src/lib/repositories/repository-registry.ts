/**
 * Repository Registry — single facade, mode-aware.
 *
 * Feature flag: `NEXT_PUBLIC_API_MODE` ('mock' | 'fetch'). In fetch
 * mode every repository talks to the Sprint 18 backend through
 * FetchApiClient; in mock mode the Mock* implementations (backed by
 * MockApiClient) keep the previous behavior.
 *
 * Mock repositories are intentionally NOT removed — they are the
 * offline/dev fallback and the test oracle for the fetch path.
 */

import { apiClient } from './api-client-provider'
import { getEnvironment } from '@/lib/config/env'
import { MockAlbumRepository } from './mock-album-repository'
import { MockMediaRepository } from './mock-media-repository'
import { MockUploadRepository } from './mock-upload-repository'
import { MockUserRepository } from './mock-user-repository'
import { MockSearchRepository } from './mock-search-repository'
import { FetchAlbumRepository } from './fetch-album-repository'
import { FetchMediaRepository } from './fetch-media-repository'
import { FetchMemberRepository } from './fetch-user-repository'
import { FetchSearchRepository } from './fetch-search-repository'
import type { AlbumRepository } from './album-repository'
import type { MediaRepository } from './media-repository'
import type { UploadRepository } from './upload-repository'
import type { UserRepository } from './user-repository'
import type { SearchRepository } from './search-repository'

export interface RepositoryRegistry {
  readonly albums: AlbumRepository
  readonly media: MediaRepository
  readonly uploads: UploadRepository
  readonly users: UserRepository
  readonly search: SearchRepository
}

const isFetchMode = (): boolean => getEnvironment().apiMode === 'fetch'

export const repositories: RepositoryRegistry = {
  albums: isFetchMode() ? new FetchAlbumRepository(apiClient) : new MockAlbumRepository(apiClient),
  media: isFetchMode() ? new FetchMediaRepository(apiClient) : new MockMediaRepository(apiClient),
  uploads: new MockUploadRepository(apiClient),
  users: isFetchMode() ? new FetchMemberRepository(apiClient) : new MockUserRepository(apiClient),
  search: isFetchMode() ? new FetchSearchRepository(apiClient) : new MockSearchRepository(),
}

export type { AlbumRepository, MediaRepository, UploadRepository, UserRepository, SearchRepository }