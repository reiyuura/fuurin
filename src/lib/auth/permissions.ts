/**
 * Authorization — pure permission helpers.
 *
 * No React, no provider import. Receives a `User | null` and returns
 * booleans. Permissions come from `@/types/auth` — the single source
 * of truth for permission strings.
 */

import {
  Permissions,
  type Permission,
  type Role,
  type User,
} from '@/types/auth'

/** Role → permission set. Single place to grant/revoke access. */
const ROLE_PERMISSIONS: Record<Role, ReadonlySet<Permission>> = {
  admin: new Set<Permission>([
    Permissions.AlbumCreate,
    Permissions.AlbumEdit,
    Permissions.AlbumDelete,
    Permissions.AlbumPublish,
    Permissions.MediaUpload,
    Permissions.MediaDelete,
  ]),
  editor: new Set<Permission>([
    Permissions.AlbumCreate,
    Permissions.AlbumEdit,
    Permissions.AlbumDelete,
    Permissions.AlbumPublish,
    Permissions.MediaUpload,
  ]),
  viewer: new Set<Permission>(),
}

export function hasRole(user: User | null | undefined, role: Role): boolean {
  return !!user && user.role === role
}

export function hasAnyRole(user: User | null | undefined, roles: readonly Role[]): boolean {
  return !!user && roles.includes(user.role)
}

export function hasPermission(
  user: User | null | undefined,
  permission: Permission,
): boolean {
  if (!user) return false
  return ROLE_PERMISSIONS[user.role].has(permission)
}

/* ── Domain helpers — the only place permission decisions live ─ */

export function canEditAlbums(user: User | null | undefined): boolean {
  return hasPermission(user, Permissions.AlbumEdit)
}

export function canCreateAlbum(user: User | null | undefined): boolean {
  return hasPermission(user, Permissions.AlbumCreate)
}

export function canDeleteAlbum(user: User | null | undefined): boolean {
  return hasPermission(user, Permissions.AlbumDelete)
}

export function canPublishAlbum(user: User | null | undefined): boolean {
  return hasPermission(user, Permissions.AlbumPublish)
}

export function canUploadMedia(user: User | null | undefined): boolean {
  return hasPermission(user, Permissions.MediaUpload)
}

export function canDeleteMedia(user: User | null | undefined): boolean {
  return hasPermission(user, Permissions.MediaDelete)
}
