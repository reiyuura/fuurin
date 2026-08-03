/**
 * NullStorageProvider — no-op storage for tests.
 *
 * Every operation succeeds silently. Keys resolve to predictable
 * URIs (`null://<key>`) so the domain layer can still reason about
 * them, but no actual I/O happens.
 */

import type { StorageProvider, StorageObject, StoragePutInput, StorageListEntry } from './storage-provider'

export class NullStorageProvider implements StorageProvider {
  async put(_input: StoragePutInput): Promise<void> {}
  async get(key: string): Promise<StorageObject | null> {
    return {
      key,
      sizeBytes: 0,
      contentType: undefined,
      uri: `null://${key}`,
      data: Buffer.alloc(0),
    }
  }
  async delete(_key: string): Promise<void> {}
  async exists(_key: string): Promise<boolean> {
    return false
  }
  async list(_prefix?: string): Promise<StorageListEntry[]> {
    return []
  }
}