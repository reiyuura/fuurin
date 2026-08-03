/**
 * AuthRepository — frontend auth: login, logout, refresh, currentUser.
 *
 * Uses FetchApiClient for transport. Token storage strategy:
 *  - Access token: kept in-memory (module variable), injected as
 *    `Authorization: Bearer` on every authenticated request.
 *  - Refresh token: HTTP-only cookie, managed entirely by the backend.
 */

import type { ApiClient, ApiResponse } from './api-client'

export type SessionUser = {
  id: string
  email: string
  displayName: string
  role: 'admin' | 'editor' | 'viewer'
  avatar: string
}

export type LoginResult = {
  user: SessionUser
  accessToken: string
  accessExpiresAt: number
}

export type RefreshResult = {
  accessToken: string
  accessExpiresAt: number
}

export interface AuthRepository {
  login(email: string, password: string): Promise<ApiResponse<LoginResult>>
  logout(): Promise<ApiResponse<{ ok: boolean }>>
  refresh(): Promise<ApiResponse<RefreshResult>>
  currentUser(): Promise<ApiResponse<SessionUser>>
}

/** Module-scoped access token — survives route changes, not page reloads. */
let _accessToken: string | null = null

export function getAccessToken(): string | null {
  return _accessToken
}

export function setAccessToken(token: string | null): void {
  _accessToken = token
}

export class FetchAuthRepository implements AuthRepository {
  constructor(private readonly api: ApiClient) {}

  async login(email: string, password: string): Promise<ApiResponse<LoginResult>> {
    const res = await this.api.request<LoginResult>({
      method: 'POST',
      path: '/auth/login',
      body: { email, password },
    })
    if (res.ok) setAccessToken(res.data.accessToken)
    return res
  }

  async logout(): Promise<ApiResponse<{ ok: boolean }>> {
    const res = await this.api.request<{ ok: boolean }>({
      method: 'POST',
      path: '/auth/logout',
    })
    setAccessToken(null)
    return res
  }

  async refresh(): Promise<ApiResponse<RefreshResult>> {
    const res = await this.api.request<RefreshResult>({
      method: 'POST',
      path: '/auth/refresh',
      body: {},
    })
    if (res.ok) setAccessToken(res.data.accessToken)
    return res
  }

  async currentUser(): Promise<ApiResponse<SessionUser>> {
    return this.api.request<SessionUser>({
      method: 'GET',
      path: '/users/me',
    })
  }
}