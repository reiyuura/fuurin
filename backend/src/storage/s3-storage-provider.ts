/**
 * S3StorageProvider — placeholder for Sprint 21+.
 *
 * The interface is fully implemented but every call throws because
 * the underlying S3 SDK dependency and config (region, bucket,
 * credentials) are not wired yet. Swapping the storage driver from
 * `local` to `s3` in env will produce a clear error at startup
 * rather than silent data loss.
 */

import type { StorageProvider, StorageObject, StoragePutInput, StorageListEntry } from './storage-provider'

export class S3StorageProvider implements StorageProvider {
  private readonly notReady = (): never => {
    throw new Error('S3StorageProvider belum diimplementasikan — Sprint 21+. Gunakan STORAGE_DRIVER=local untuk sekarang.')
  }

  async put(_input: StoragePutInput): Promise<void> { return this.notReady() }
  async get(_key: string): Promise<StorageObject | null> { return this.notReady() }
  async delete(_key: string): Promise<void> { return this.notReady() }
  async exists(_key: string): Promise<boolean> { return this.notReady() }
  async list(_prefix?: string): Promise<StorageListEntry[]> { return this.notReady() }
}