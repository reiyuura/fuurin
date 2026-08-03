/**
 * LocalStorageProvider — filesystem-backed StorageProvider.
 *
 * Default in Sprint 16. Total abstraction holds: call sites depend on
 * `StorageProvider`, so swapping to S3/R2/MinIO in Sprint 20 never
 * touches business logic.
 *
 * Security: resolves keys through a safe join that rejects path
 * traversal (`..`, absolute paths) to prevent writes/reads outside
 * `root`/`STORAGE_LOCAL_ROOT`.
 */

import { promises as fs } from 'node:fs'
import path from 'node:path'
import type {
  StorageListEntry,
  StorageObject,
  StorageProvider,
  StoragePutInput,
} from './storage-provider'

export class LocalStorageProvider implements StorageProvider {
  private readonly root: string

  constructor(root: string) {
    this.root = path.resolve(root)
  }

  private resolveSafe(key: string): string {
    // Normalize and reject traversal.
    const safe = key.replace(/^\/+/, '')
    const resolved = path.resolve(this.root, safe)
    if (!resolved.startsWith(this.root + path.sep) && resolved !== this.root) {
      throw new Error(`Storage key escapes root: ${key}`)
    }
    return resolved
  }

  async put(input: StoragePutInput): Promise<void> {
    const target = this.resolveSafe(input.key)
    await fs.mkdir(path.dirname(target), { recursive: true })
    await fs.writeFile(target, input.data)
  }

  async get(key: string): Promise<StorageObject | null> {
    const target = this.resolveSafe(key)
    try {
      const stat = await fs.stat(target)
      const data = await fs.readFile(target)
      return {
        key,
        sizeBytes: stat.size,
        contentType: guessMime(key),
        uri: target,
        data,
      }
    } catch (cause) {
      if ((cause as NodeJS.ErrnoException).code === 'ENOENT') return null
      throw cause
    }
  }

  async delete(key: string): Promise<void> {
    const target = this.resolveSafe(key)
    try {
      await fs.unlink(target)
    } catch (cause) {
      if ((cause as NodeJS.ErrnoException).code !== 'ENOENT') throw cause
    }
  }

  async exists(key: string): Promise<boolean> {
    const target = this.resolveSafe(key)
    try {
      await fs.access(target)
      return true
    } catch {
      return false
    }
  }

  async list(prefix = ''): Promise<StorageListEntry[]> {
    const base = path.resolve(this.root, prefix.replace(/^\/+/, ''))
    const out: StorageListEntry[] = []
    const walk = async (dir: string, rel: string): Promise<void> => {
      let entries: import('node:fs').Dirent[]
      try {
        entries = await fs.readdir(dir, { withFileTypes: true })
      } catch (cause) {
        if ((cause as NodeJS.ErrnoException).code === 'ENOENT') return
        throw cause
      }
      for (const entry of entries) {
        const full = path.join(dir, entry.name)
        const relPath = path.join(rel, entry.name)
        if (entry.isDirectory()) {
          await walk(full, relPath)
        } else {
          const stat = await fs.stat(full)
          out.push({
            key: relPath.split(path.sep).join('/'),
            sizeBytes: stat.size,
            contentType: guessMime(entry.name),
            modifiedAt: stat.mtime.toISOString(),
          })
        }
      }
    }
    await walk(base, prefix.replace(/^\/+/, ''))
    return out
  }
}

function guessMime(name: string): string | undefined {
  const ext = path.extname(name).toLowerCase().replace(/^\./, '')
  const map: Record<string, string> = {
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    webp: 'image/webp',
    gif: 'image/gif',
    avif: 'image/avif',
  }
  return map[ext] ?? undefined
}