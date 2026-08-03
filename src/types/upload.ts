/**
 * Upload Pipeline — shared types.
 *
 * Used by the upload feature (queue, worker, UI) and (in future sprints)
 * by the upload repository and the backend provider. Components MUST NOT
 * recompose these locally.
 */

export type UploadStatus =
  /** File accepted and waiting for the worker pool. */
  | 'queued'
  /** Reading hash + dimensions before the worker picks it up. */
  | 'validating'
  /** Hash + dimensions known — ready to upload. */
  | 'ready'
  /** Upload in progress. */
  | 'uploading'
  /** Upload finished successfully. */
  | 'completed'
  /** Upload errored. Retry is available. */
  | 'failed'
  /** User cancelled mid-upload. */
  | 'cancelled'

export interface UploadItem {
  /** Stable id derived via `uploadId()` — same file always produces the same id. */
  id: string
  /** Filename — kept as a plain field so UI doesn't need to read `file.name`. */
  name: string
  /** MIME type from `file.type`. */
  type: string
  /** Size in bytes — mirrors `file.size`. */
  bytes: number
  /** Last-modified timestamp from the file — part of the stable id. */
  lastModified: number
  /** Current status. */
  status: UploadStatus
  /** Progress 0–100. */
  progress: number
  /** Object URL of the local preview thumbnail — caller must `revokeObjectURL` on remove/unmount. */
  previewUrl: string
  /** Fingerprint hash (or undefined until the validator finishes). */
  hash?: string
  /** Image dimensions in pixels — undefined until validation finishes. */
  width?: number
  height?: number
  /** Error message — set when status === 'failed'. */
  error?: string
  /** When the user cancelled or removed — useful for status badges. */
  finishedAt?: number
}

/** Validation issue produced by `validateFile`. */
export type UploadValidationCode = 'too_large' | 'unsupported_type' | 'duplicate'

export interface UploadValidationIssue {
  code: UploadValidationCode
  message: string
}

export interface UploadValidation {
  valid: boolean
  errors: UploadValidationIssue[]
}

/** Options passed to the upload worker — defaults below if a field is omitted. */
export interface UploadOptions {
  /** Max bytes per file — default 10 MiB. */
  maxBytes?: number
  /** Accepted MIME types — default ['image/jpeg','image/png','image/webp','image/gif']. */
  acceptedTypes?: string[]
  /** Max simultaneous uploads — default 3. */
  maxConcurrent?: number
  /** Total simulated upload time per file (ms) — default 1500. */
  mockSpeedMs?: number
  /** Granularity of progress ticks (ms) — default 60 (~16fps). */
  progressTickMs?: number
}

export const UPLOAD_DEFAULTS = {
  maxBytes: 10 * 1024 * 1024,
  acceptedTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'] as string[],
  maxConcurrent: 3,
  mockSpeedMs: 1500,
  progressTickMs: 60,
}
