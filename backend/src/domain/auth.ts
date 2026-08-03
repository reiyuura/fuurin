/**
 * Auth domain — public shapes (DTOs that flow to the wire).
 */

export type UserRole = 'admin' | 'editor' | 'viewer'

export type SessionUser = {
  id: string
  email: string
  displayName: string
  role: UserRole
  avatar: string
}

export type LoginPayload = {
  email: string
  password: string
}

export type LoginResult = {
  user: SessionUser
  accessToken: string
  accessExpiresAt: number
  refreshToken: string
  refreshExpiresAt: number
}

export type RefreshResult = {
  accessToken: string
  accessExpiresAt: number
  refreshToken: string
  refreshExpiresAt: number
}

export type StatsSummary = {
  totalAlbums: number
  totalPhotos: number
  totalMembers: number
  totalTimelineEntries: number
}