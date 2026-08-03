/**
 * Filter helper — converts a `QueryOptions.filter` into a Prisma `where`
 * fragment. **Only whitelisted columns are accepted** — unknown keys
 * throw `err('validation', 'unknown filter: <key>')` so the frontend
 * cannot probe arbitrary columns.
 */

import type { Prisma } from '@prisma/client'
import type { FilterSpec } from '../../shared/paging'
import { err, ok, type Result } from '../../shared/result'

export type FilterTable = 'album' | 'photo' | 'timeline' | 'member' | 'draft' | 'upload'

type Whitelist = Record<string, (v: string | number | boolean) => unknown>

const ALBUM_FILTERS: Whitelist = {
  category: (v) => v,
  season: (v) => v,
  visibility: (v) => v,
}

const PHOTO_FILTERS: Whitelist = {
  album: (v) => v, // matches Photo.albumSlug
  tag: (v) => ({ tags: { has: v } }), // Postgres array contains
  orientation: (v) => v,
}

const TIMELINE_FILTERS: Whitelist = {
  album: (v) => ({ albumId: v }), // TimelineEntry.albumId (matches Album.slug)
  category: (v) => ({ categoryTag: v }),
}

const MEMBER_FILTERS: Whitelist = {}

const DRAFT_FILTERS: Whitelist = {
  visibility: (v) => v,
  album: (v) => ({ albumId: v }),
}

const UPLOAD_FILTERS: Whitelist = {
  status: (v) => v,
}

const TABLE_FILTERS: Record<FilterTable, Whitelist> = {
  album: ALBUM_FILTERS,
  photo: PHOTO_FILTERS,
  timeline: TIMELINE_FILTERS,
  member: MEMBER_FILTERS,
  draft: DRAFT_FILTERS,
  upload: UPLOAD_FILTERS,
}

export function buildWhere<T extends Prisma.AlbumWhereInput | Prisma.PhotoWhereInput | Prisma.TimelineEntryWhereInput | Prisma.MemberWhereInput | Prisma.AlbumDraftWhereInput | Prisma.UploadRecordWhereInput>(
  table: FilterTable,
  filter?: FilterSpec,
): Result<T> {
  const whitelist = TABLE_FILTERS[table]
  const where: Record<string, unknown> = {}
  if (!filter) return ok({} as T)

  for (const [key, value] of Object.entries(filter)) {
    if (value === undefined || value === null || value === '') continue
    const builder = whitelist[key]
    if (!builder) {
      return err('validation', `unknown filter: ${key}`, { table, key })
    }
    const clause = builder(value as string | number | boolean)
    // Flatten single-key fragments (e.g. { tags: { has: v } }) into the where root.
    if (clause && typeof clause === 'object' && !Array.isArray(clause)) {
      const entries = Object.entries(clause as Record<string, unknown>)
      if (entries.length === 1) {
        const [k, v] = entries[0]!
        // Translate `album` column-name to the actual Prisma field on this table.
        const mapped = mapColumn(table, key, k)
        where[mapped] = v
        continue
      }
    }
    where[mapColumn(table, key)] = clause
  }
  return ok(where as T)
}

function mapColumn(table: FilterTable, publicKey: string, fragmentKey?: string): string {
  if (table === 'photo' && publicKey === 'album') return 'albumSlug'
  if (table === 'photo' && fragmentKey === 'tags') return 'tags'
  if (table === 'timeline' && publicKey === 'album') return 'albumId'
  if (table === 'draft' && publicKey === 'album') return 'albumId'
  return publicKey
}