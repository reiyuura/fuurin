import type { NextConfig } from 'next'
import { validateEnvironment } from './src/lib/config/env'
import { buildSecurityHeaders } from './src/lib/config/security-headers'

// Build-time validation complements instrumentation's startup gate.
// Production builds fail immediately instead of producing an artifact
// backed by a partially invalid runtime configuration.
const env = validateEnvironment()
const securityHeaders = buildSecurityHeaders(env)

// Uploaded photos/avatars are served from our own API origin — the image
// optimizer must whitelist it, otherwise uploaded pictures 400 while
// Unsplash placeholders work (only absolute URLs need a pattern).
const apiOrigin = new URL(env.apiBaseUrl)
const ownHost = { protocol: apiOrigin.protocol.replace(':', '') as 'http' | 'https', hostname: apiOrigin.hostname }

const nextConfig: NextConfig = {
  poweredByHeader: false,
  compress: true,
  productionBrowserSourceMaps: false,
  images: {
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [
      { protocol: 'https', hostname: 'images.unsplash.com' },
      ownHost,
    ],
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: securityHeaders,
      },
      {
        source: '/api/:path*',
        headers: [{ key: 'Cache-Control', value: 'no-store, max-age=0' }],
      },
    ]
  },
}

export default nextConfig
