/**
 * R2StorageProvider — placeholder for Cloudflare R2 (Sprint 21+).
 */

import type { StorageProvider, StorageObject, StoragePutInput, StorageListEntry } from './storage-provider'

export class R2StorageProvider implements StorageProvider {
  private readonly notReady = (): never => {
    throw new Error('R2StorageProvider belum diimplementasikan — Sprint 21+. Gunakan STORAGE_DRIVER=local untuk sekarang.')
  }
  async put(_input: StoragePutInput): Promise<void> { return this.notReady() }
  async get(_key: string): Promise<StorageObject | null> { return this.notReady() }
  async delete(_key: string): Promise<void> { return this.notReady() }
  async exists(_key: string): Promise<boolean> { return this.notReady() }
  async list(_prefix?: string): Promise<StorageListEntry[]> { return this.notReady() }
}