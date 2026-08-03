import type { RuntimeEnv } from './env'

export type SecurityHeader = { key: string; value: string }

export function buildContentSecurityPolicy(env: RuntimeEnv): string {
  const connect = new Set<string>(["'self'"])
  if (env.apiMode === 'fetch' && env.apiBaseUrl) {
    try {
      connect.add(new URL(env.apiBaseUrl).origin)
    } catch {
      // Environment validation reports invalid URLs before startup.
    }
  }

  const directives = [
    "default-src 'self'",
    "base-uri 'self'",
    "object-src 'none'",
    "frame-ancestors 'none'",
    "form-action 'self'",
    // Next runtime/theme initialization requires inline scripts/styles.
    // Nonce-based CSP is a future tightening step because it changes
    // root rendering and proxy behavior beyond this hardening sprint.
    "script-src 'self' 'unsafe-inline'",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' data: https://fonts.gstatic.com",
    "img-src 'self' data: blob: https:",
    `connect-src ${[...connect].join(' ')}`,
    "frame-src 'none'",
    "worker-src 'self' blob:",
    "manifest-src 'self'",
  ]

  if (env.nodeEnv === 'production') directives.push('upgrade-insecure-requests')
  return directives.join('; ')
}

export function buildSecurityHeaders(env: RuntimeEnv): SecurityHeader[] {
  return [
    { key: 'Content-Security-Policy', value: buildContentSecurityPolicy(env) },
    { key: 'X-Frame-Options', value: 'DENY' },
    { key: 'X-Content-Type-Options', value: 'nosniff' },
    { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
    {
      key: 'Permissions-Policy',
      value: 'camera=(), microphone=(), geolocation=(), payment=(), usb=()',
    },
    { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
  ]
}
