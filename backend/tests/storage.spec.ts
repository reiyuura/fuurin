/**
 * Storage abstraction tests — LocalStorageProvider through the
 * StorageProvider interface. Future S3/R2/MinIO providers must pass
 * the same suite (swap the construction in `createProvider`).
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { LocalStorageProvider, type StorageProvider } from '../src/storage'

let root: string
let provider: StorageProvider

beforeEach(async () => {
  root = await mkdtemp(path.join(tmpdir(), 'fuurin-storage-'))
  provider = new LocalStorageProvider(root)
})

afterEach(async () => {
  await rm(root, { recursive: true, force: true })
})

describe('StorageProvider (LocalStorageProvider)', () => {
  it('puts and gets a buffer round-trip', async () => {
    await provider.put({ key: 'albums/a/1.jpg', data: Buffer.from('hello'), contentType: 'image/jpeg' })
    const obj = await provider.get('albums/a/1.jpg')
    expect(obj).not.toBeNull()
    expect(obj!.data.toString()).toBe('hello')
    expect(obj!.contentType).toBe('image/jpeg')
  })

  it('returns null for missing key', async () => {
    expect(await provider.get('nope.jpg')).toBeNull()
  })

  it('exists() reflects reality', async () => {
    await provider.put({ key: 'x/y.png', data: Buffer.from('1') })
    expect(await provider.exists('x/y.png')).toBe(true)
    expect(await provider.exists('x/missing.png')).toBe(false)
  })

  it('delete is idempotent', async () => {
    await provider.put({ key: 'a/b.png', data: Buffer.from('1') })
    await provider.delete('a/b.png')
    await provider.delete('a/b.png') // no throw
    expect(await provider.exists('a/b.png')).toBe(false)
  })

  it('list returns entries under a prefix with metadata', async () => {
    await provider.put({ key: 'albums/a/1.jpg', data: Buffer.from('x') })
    await provider.put({ key: 'albums/a/2.png', data: Buffer.from('yy') })
    await provider.put({ key: 'albums/b/3.webp', data: Buffer.from('zzz') })

    const all = await provider.list()
    expect(all).toHaveLength(3)

    const a = await provider.list('albums/a')
    expect(a).toHaveLength(2)
    expect(a.map((e) => e.key).sort()).toEqual(['albums/a/1.jpg', 'albums/a/2.png'])
    expect(a[0]!.sizeBytes).toBe(1)
  })

  it('rejects path traversal outside root', async () => {
    await expect(provider.put({ key: '../../etc/evil', data: Buffer.from('x') })).rejects.toThrow()
  })
})