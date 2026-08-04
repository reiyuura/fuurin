/**
 * Security headers plugin — Sprint 25 hardening.
 *
 * CSP scoped to the API responses (JSON). Static asset CSP is handled
 * by the frontend (Next.js headers) / Caddy layer.
 */

import type { FastifyInstance } from 'fastify'

export function configureSecurityHeaders(app: FastifyInstance): void {
  app.addHook('onSend', async (_request, reply) => {
    reply.header('X-Content-Type-Options', 'nosniff')
    reply.header('X-Frame-Options', 'DENY')
    reply.header('Referrer-Policy', 'strict-origin-when-cross-origin')
    reply.header('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')
    // CSP: API serves JSON only; default-src none, connect-src self.
    reply.header(
      'Content-Security-Policy',
      "default-src 'none'; frame-ancestors 'none'; base-uri 'none'",
    )
  })
}