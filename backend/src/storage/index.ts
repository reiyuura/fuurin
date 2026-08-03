/**
 * Storage factory — selects the StorageProvider from `STORAGE_DRIVER`.
 *
 * Sprint 16 only ships `local`. Adding S3/R2/MinIO in Sprint 20 means
 * extending this switch (and validating the new driver name in
 * `config/env.ts`) — no business code changes.
 */

import type { Env } from '../config/env'
import {
  type StorageProvider,
  type StorageObject,
  type StoragePutInput,
  type StorageListEntry,
} from './storage-provider'
import { LocalStorageProvider } from './local-storage-provider'

export function createStorageProvider(env: Env): StorageProvider {
  switch (env.STORAGE_DRIVER) {
    case 'local':
      return new LocalStorageProvider(env.STORAGE_LOCAL_ROOT)
    default: {
      const _exhaustive: never = env.STORAGE_DRIVER
      throw new Error(`Unsupported STORAGE_DRIVER: ${String(_exhaustive)}`)
    }
  }
}

export type { StorageProvider, StorageObject, StoragePutInput, StorageListEntry }
export { LocalStorageProvider }
export { NullStorageProvider } from './null-storage-provider'
export { S3StorageProvider } from './s3-storage-provider'
export { R2StorageProvider } from './r2-storage-provider'