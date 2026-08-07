/**
 * api-base-url — single source of truth for the "<baseUrl>/<version>"
 * prefix. Every caller (FetchApiClient, the 401-refresh interceptor,
 * ad-hoc fetchers) must build URLs through this so env values with or
 * without trailing/leading slashes all normalize identically.
 */

import type { ApiConfig } from '@/types/api-config'

export function buildApiBaseUrl(
  config: Pick<ApiConfig, 'baseUrl' | 'version'>,
): string {
  const baseUrl = config.baseUrl.replace(/\/+$/, '')
  const version = config.version
    ? `/${config.version.replace(/^\/+|\/+$/g, '')}`
    : ''
  return `${baseUrl}${version}`
}
