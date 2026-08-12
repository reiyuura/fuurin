import type { MetadataRoute } from 'next'
import { repositories } from '@/lib/repositories/repository-registry'
import { getEnvironment } from '@/lib/config/env'
import { monitoring } from '@/lib/monitoring/monitoring-provider'

export const dynamic = 'force-dynamic'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = getEnvironment().siteUrl
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${base}/`, lastModified: new Date(), changeFrequency: 'weekly', priority: 1 },
    { url: `${base}/albums`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.9 },
    { url: `${base}/timeline`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.6 },
    { url: `${base}/about`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.6 },
  ]

  const result = await repositories.albums.listAlbums()
  if (!result.ok) {
    monitoring.captureMessage('Sitemap album lookup failed', 'warning', {
      pathname: '/sitemap.xml',
      extra: { code: result.error.code },
    })
    return staticRoutes
  }

  return [
    ...staticRoutes,
    ...result.value.map((album) => ({
      url: `${base}/albums/${album.slug}`,
      lastModified: new Date(`${album.date}T00:00:00Z`),
      changeFrequency: 'monthly' as const,
      priority: 0.8,
    })),
  ]
}
