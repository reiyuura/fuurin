/**
 * Pagination helper — converts `QueryOptions` (with `page` + `limit` on
 * the wire) to Prisma `skip` + `take`. Returns a `PageResult<T>` helper
 * for endpoints that paginate (currently only `AlbumRepository.listAlbums`).
 */

import type { PageResult } from '../../shared/paging'

export const DEFAULT_LIMIT = 20
export const MAX_LIMIT = 100

export function clampPagination(
  page: number | undefined,
  limit: number | undefined,
): { skip: number; take: number; page: number; size: number } {
  const safePage = Math.max(0, page ?? 0)
  const size = Math.min(MAX_LIMIT, Math.max(1, limit ?? DEFAULT_LIMIT))
  return { skip: safePage * size, take: size, page: safePage, size }
}

export function buildPageResult<T>(
  items: T[],
  total: number,
  page: number | undefined,
  limit: number | undefined,
): PageResult<T> {
  const { page: p, size } = clampPagination(page, limit)
  return { items, total, page: p, size }
}