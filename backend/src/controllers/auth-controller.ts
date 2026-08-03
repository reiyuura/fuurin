/**
 * Auth controller — login, refresh, logout, users/me.
 *
 * Parsing + response shaping only; logic in AuthService.
 */

import type { FastifyReply, FastifyRequest } from 'fastify'
import type { AuthService } from '../services/auth-service'
import type { Env } from '../config/env'
import { ApiError } from '../shared/errors'
import { parseOrThrow } from './zod-parse'
import { loginSchema, refreshSchema } from '../schemas/auth-schemas'
import type { AuthedRequest } from '../plugins/auth-guard'

export function createAuthController(service: AuthService, env: Env) {
  return {
    /** POST /auth/login */
    async login(request: FastifyRequest, reply: FastifyReply) {
      const input = parseOrThrow(loginSchema, request.body, 'payload login')
      const result = await service.login(input)
      if (!result.ok) throw new ApiError(result.error.code, result.error.message)

      // Set refresh token as HTTP-only cookie.
      reply.setCookie(env.JWT_REFRESH_COOKIE, result.value.refreshToken, {
        httpOnly: true,
        secure: env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/api/v1/auth',
        expires: new Date(result.value.refreshExpiresAt),
      })

      return reply.send({
        user: result.value.user,
        accessToken: result.value.accessToken,
        accessExpiresAt: result.value.accessExpiresAt,
      })
    },

    /** POST /auth/refresh */
    async refresh(request: FastifyRequest, reply: FastifyReply) {
      // Try body first; fall back to cookie.
      const fromBody = parseOrThrow(refreshSchema, request.body ?? {}, 'payload refresh')
      const refreshToken =
        fromBody.refreshToken ||
        request.cookies[env.JWT_REFRESH_COOKIE] ||
        ''

      if (!refreshToken) {
        throw new ApiError('unauthorized', 'Refresh token diperlukan.')
      }

      const result = await service.refresh(refreshToken)
      if (!result.ok) throw new ApiError(result.error.code, result.error.message)

      reply.setCookie(env.JWT_REFRESH_COOKIE, result.value.refreshToken, {
        httpOnly: true,
        secure: env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/api/v1/auth',
        expires: new Date(result.value.refreshExpiresAt),
      })

      return reply.send({
        accessToken: result.value.accessToken,
        accessExpiresAt: result.value.accessExpiresAt,
      })
    },

    /** POST /auth/logout */
    async logout(request: FastifyRequest, reply: FastifyReply) {
      const cookieToken = request.cookies[env.JWT_REFRESH_COOKIE] || ''
      if (cookieToken) {
        await service.logout(cookieToken)
      }
      reply.clearCookie(env.JWT_REFRESH_COOKIE, { path: '/api/v1/auth' })
      return reply.send({ ok: true })
    },

    /** GET /users/me — requires auth */
    async me(request: FastifyRequest, reply: FastifyReply) {
      const req = request as AuthedRequest
      if (!req.user || !req.user.id) {
        throw new ApiError('unauthorized', 'Token akses diperlukan.')
      }
      const result = await service.currentUser(req.user.id)
      if (!result.ok) throw new ApiError(result.error.code, result.error.message)
      if (!result.value) throw new ApiError('not_found', 'Pengguna tidak ditemukan.')
      return reply.send(result.value)
    },
  }
}