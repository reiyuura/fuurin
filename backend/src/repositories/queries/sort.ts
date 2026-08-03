/**
 * Sort helper — converts a `QueryOptions.sort` into a stable Prisma
 * `orderBy`. Unknown keys are ignored silently so the frontend can probe
 * new sort axes without breaking the backend.
 *
 * A secondary tie-breaker is appended for stability under equal sort
 * keys — pagination requires deterministic order.
 */

import type { Prisma } from '@prisma/client'
import type { SortSpec } from '../../shared/paging'

type AlbumOrderBy = Prisma.AlbumOrderByWithRelationInput | Prisma.AlbumOrderByWithRelationInput[]
type PhotoOrderBy = Prisma.PhotoOrderByWithRelationInput | Prisma.PhotoOrderByWithRelationInput[]
type TimelineOrderBy =
  | Prisma.TimelineEntryOrderByWithRelationInput
  | Prisma.TimelineEntryOrderByWithRelationInput[]
type MemberOrderBy = Prisma.MemberOrderByWithRelationInput | Prisma.MemberOrderByWithRelationInput[]
type DraftOrderBy = Prisma.AlbumDraftOrderByWithRelationInput | Prisma.AlbumDraftOrderByWithRelationInput[]
type UploadOrderBy =
  | Prisma.UploadRecordOrderByWithRelationInput
  | Prisma.UploadRecordOrderByWithRelationInput[]

const ALBUM_SORTS: Record<string, AlbumOrderBy> = {
  date: [{ date: 'desc' }, { slug: 'asc' }],
  views: [{ views: 'desc' }, { slug: 'asc' }],
  count: [{ count: 'desc' }, { slug: 'asc' }],
  createdAt: [{ createdAt: 'desc' }, { slug: 'asc' }],
  updatedAt: [{ updatedAt: 'desc' }, { slug: 'asc' }],
}

const PHOTO_SORTS: Record<string, PhotoOrderBy> = {
  idx: [{ idx: 'asc' }, { id: 'asc' }],
  date: [{ date: 'desc' }, { idx: 'asc' }],
  likes: [{ likes: 'desc' }, { idx: 'asc' }],
  createdAt: [{ createdAt: 'desc' }, { idx: 'asc' }],
}

const TIMELINE_SORTS: Record<string, TimelineOrderBy> = {
  date: [{ date: 'desc' }, { id: 'asc' }],
}

const MEMBER_SORTS: Record<string, MemberOrderBy> = {
  nameJa: [{ nameJa: 'asc' }, { id: 'asc' }],
}

const DRAFT_SORTS: Record<string, DraftOrderBy> = {
  updatedAt: [{ updatedAt: 'desc' }, { slug: 'asc' }],
}

const UPLOAD_SORTS: Record<string, UploadOrderBy> = {
  createdAt: [{ createdAt: 'desc' }, { id: 'asc' }],
  status: [{ status: 'asc' }, { createdAt: 'desc' }, { id: 'asc' }],
}

type SortTable = 'album' | 'photo' | 'timeline' | 'member' | 'draft' | 'upload'

/** Overloaded signatures — return type tracks the table argument. */
export function buildOrderBy(table: 'album', sort?: SortSpec[]): AlbumOrderBy | undefined
export function buildOrderBy(table: 'photo', sort?: SortSpec[]): PhotoOrderBy | undefined
export function buildOrderBy(table: 'timeline', sort?: SortSpec[]): TimelineOrderBy | undefined
export function buildOrderBy(table: 'member', sort?: SortSpec[]): MemberOrderBy | undefined
export function buildOrderBy(table: 'draft', sort?: SortSpec[]): DraftOrderBy | undefined
export function buildOrderBy(table: 'upload', sort?: SortSpec[]): UploadOrderBy | undefined
export function buildOrderBy(table: SortTable, sort?: SortSpec[]) {
  const map: Record<string, unknown> = {
    album: ALBUM_SORTS,
    photo: PHOTO_SORTS,
    timeline: TIMELINE_SORTS,
    member: MEMBER_SORTS,
    draft: DRAFT_SORTS,
    upload: UPLOAD_SORTS,
  }[table]
  if (!sort || sort.length === 0) {
    const defaultKey = Object.keys(map)[0]
    return defaultKey ? map[defaultKey] : undefined
  }
  for (const spec of sort) {
    const direct = map[spec.key]
    if (direct) return direct
  }
  const defaultKey = Object.keys(map)[0]
  return defaultKey ? map[defaultKey] : undefined
}