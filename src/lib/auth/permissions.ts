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

/**
 * Anything carrying a role — both `User` (full profile) and the leaner
 * `SessionUser` from the auth repository satisfy this. Permission
 * decisions only ever need the role.
 */
export type RoleBearer = Pick<User, 'role'>

export function hasRole(user: RoleBearer | null | undefined, role: Role): boolean {
  return !!user && user.role === role
}

export function hasAnyRole(user: RoleBearer | null | undefined, roles: readonly Role[]): boolean {
  return !!user && roles.includes(user.role)
}

export function hasPermission(
  user: RoleBearer | null | undefined,
  permission: Permission,
): boolean {
  if (!user) return false
  return ROLE_PERMISSIONS[user.role].has(permission)
}

/* ── Domain helpers — the only place permission decisions live ─ */

export function canEditAlbums(user: RoleBearer | null | undefined): boolean {
  return hasPermission(user, Permissions.AlbumEdit)
}

export function canCreateAlbum(user: RoleBearer | null | undefined): boolean {
  return hasPermission(user, Permissions.AlbumCreate)
}

export function canDeleteAlbum(user: RoleBearer | null | undefined): boolean {
  return hasPermission(user, Permissions.AlbumDelete)
}

export function canPublishAlbum(user: RoleBearer | null | undefined): boolean {
  return hasPermission(user, Permissions.AlbumPublish)
}

export function canUploadMedia(user: RoleBearer | null | undefined): boolean {
  return hasPermission(user, Permissions.MediaUpload)
}

export function canDeleteMedia(user: RoleBearer | null | undefined): boolean {
  return hasPermission(user, Permissions.MediaDelete)
}
