/**
 * UploadService — file upload with validation + storage.
 *
 * Depends on StorageProvider (never fs directly) and Env (for size
 * limits). Business rules:
 *  - allowed MIME: JPEG, PNG, WEBP
 *  - max size: UPLOAD_MAX_BYTES (env)
 *  - filename sanitization: strip path, random prefix
 *  - storage key: `uploads/<random>-<safe-name>.<ext>`
 */

import crypto from 'node:crypto'
import path from 'node:path'
import type { Env } from '../config/env'
import type { StorageProvider } from '../storage/storage-provider'
import { err, ok, type Result } from '../shared/result'

export type UploadResult = {
  key: string
  url: string
  sizeBytes: number
  contentType: string
}

const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp'])
const EXT_MAP: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
}

export class UploadService {
  constructor(
    private readonly storage: StorageProvider,
    private readonly env: Env,
  ) {}

  async upload(file: { filename: string; mimeType: string; data: Buffer }): Promise<Result<UploadResult>> {
    // Validate MIME.
    if (!ALLOWED_MIME.has(file.mimeType)) {
      return err('validation', `Format file tidak didukung (${file.mimeType}). Gunakan JPEG, PNG, atau WEBP.`)
    }

    // Validate size.
    if (file.data.byteLength > this.env.UPLOAD_MAX_BYTES) {
      const maxMB = Math.round(this.env.UPLOAD_MAX_BYTES / (1024 * 1024))
      return err('validation', `Ukuran file melebihi batas maksimum ${maxMB}MB.`)
    }

    // Sanitize filename: strip path, keep extension, prefix random.
    const ext = EXT_MAP[file.mimeType] ?? path.extname(file.filename).toLowerCase()
    const safeBase = path.basename(file.filename, path.extname(file.filename))
      .replace(/[^a-zA-Z0-9_-]/g, '_')
      .slice(0, 64)
    const random = crypto.randomBytes(8).toString('hex')
    const key = `uploads/${random}-${safeBase}${ext}`

    await this.storage.put({
      key,
      data: file.data,
      contentType: file.mimeType,
    })

    return ok({
      key,
      url: `/api/v1/uploads/${key}`, // Serve via dedicated route.
      sizeBytes: file.data.byteLength,
      contentType: file.mimeType,
    })
  }
}