import type { NextConfig } from 'next'
import { validateEnvironment } from './src/lib/config/env'
import { buildSecurityHeaders } from './src/lib/config/security-headers'

// Build-time validation complements instrumentation's startup gate.
// Production builds fail immediately instead of producing an artifact
// backed by a partially invalid runtime configuration.
const env = validateEnvironment()
const securityHeaders = buildSecurityHeaders(env)

const nextConfig: NextConfig = {
  poweredByHeader: false,
  compress: true,
  productionBrowserSourceMaps: false,
  images: {
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [
      { protocol: 'https', hostname: 'images.unsplash.com' },
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
