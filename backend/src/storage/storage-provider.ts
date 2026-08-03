/**
 * StorageProvider — storage abstraction contract.
 *
 * Created in Sprint 16 (required refinement #3) so Sprint 20 only adds
 * `S3StorageProvider` / `R2StorageProvider` / `MinIOStorageProvider`
 * implementations WITHOUT touching business logic. Everything that
 * stores or reads binary data depends on this interface, never on a
 * concrete storage backend.
 *
 *   StorageProvider
 *        │
 *        ├── LocalStorageProvider   (Sprint 16 — default)
 *        ├── S3StorageProvider      (Sprint 20+)
 *        ├── R2StorageProvider      (Sprint 20+)
 *        └── MinIOStorageProvider   (Sprint 20+)
 */

export type StoragePutInput = {
  /** Logical key under the bucket root, e.g. `albums/hanami-2026/5.jpg`. */
  key: string
  data: Buffer | Uint8Array
  /** MIME type for Content-Type / object metadata. */
  contentType?: string
}

export type StorageObject = {
  key: string
  sizeBytes: number
  contentType?: string
  /** Provider URI for retrieval, if applicable. */
  uri: string
  data: Buffer
}

export type StorageListEntry = {
  key: string
  sizeBytes: number
  contentType?: string
  modifiedAt?: string
}

export interface StorageProvider {
  /** Persist a binary object. Overwrites when the key already exists. */
  put(input: StoragePutInput): Promise<void>
  /** Fetch a binary object by key. Throws/returns not-found when absent. */
  get(key: string): Promise<StorageObject | null>
  /** Delete an object. Idempotent — missing key is not an error. */
  delete(key: string): Promise<void>
  /** Check existence without fetching contents. */
  exists(key: string): Promise<boolean>
  /** List objects under a key prefix (folder). */
  list(prefix?: string): Promise<StorageListEntry[]>
}