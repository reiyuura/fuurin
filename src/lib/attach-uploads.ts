/**
 * attach-uploads — turn uploaded FILES (storage objects from
 * POST /uploads) into real Photo rows attached to an album.
 *
 * The gap this closes: uploading a file only stores bytes; without a
 * Photo row the picture is invisible in albums and the media library.
 */

import type { ApiClient } from '@/lib/repositories/api-client'
import { getEnvironment } from '@/lib/config/env'

export type UploadedFile = {
  /** URL returned by POST /uploads (relative or absolute). */
  url: string
  /** Original filename — used for the default caption. */
  name: string
  orientation?: 'landscape' | 'portrait'
}

/** POST /uploads returns a RELATIVE url; Photo.src must be absolute. */
export function absoluteUploadUrl(url: string): string {
  if (url.startsWith('http')) return url
  return `${new URL(getEnvironment().apiBaseUrl).origin}${url}`
}

export async function attachUploadsToAlbum(
  client: ApiClient,
  albumSlug: string,
  files: UploadedFile[],
): Promise<{ attached: number; failed: number }> {
  // Continue after the current max idx — deletions can leave gaps, and
  // @@unique(albumSlug, idx) rejects collisions.
  let nextIdx = 0
  const photosRes = await client.request<Array<{ idx: number }> | { items: Array<{ idx: number }> }>({
    method: 'GET',
    path: `/albums/${albumSlug}/photos`,
  })
  if (photosRes.ok) {
    const rows = Array.isArray(photosRes.data)
      ? photosRes.data
      : (photosRes.data as { items?: Array<{ idx: number }> }).items ?? []
    nextIdx = rows.reduce((max, p) => Math.max(max, p.idx ?? -1), -1) + 1
  }

  let attached = 0
  let failed = 0
  const today = new Date().toISOString().slice(0, 10)
  for (const f of files) {
    const name = f.name.replace(/\.[a-z0-9]+$/i, '') || 'Foto'
    const res = await client.request({
      method: 'POST',
      path: '/media',
      body: {
        albumSlug,
        idx: nextIdx++,
        src: absoluteUploadUrl(f.url),
        caption: { ja: name, id: name, en: name },
        ago: { ja: 'たった今', id: 'baru saja', en: 'just now' },
        orientation: f.orientation ?? 'landscape',
        date: today,
      },
    })
    if (res.ok) attached++
    else failed++
  }
  return { attached, failed }
}
