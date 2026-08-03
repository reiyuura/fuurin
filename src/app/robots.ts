import type { MetadataRoute } from 'next'
import { getEnvironment } from '@/lib/config/env'

export default function robots(): MetadataRoute.Robots {
  const base = getEnvironment().siteUrl
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: [
        '/login',
        '/upload',
        '/albums/new',
        '/albums/*/edit',
        '/api/',
      ],
    },
    sitemap: `${base}/sitemap.xml`,
    host: base,
  }
}
