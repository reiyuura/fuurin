export type ApiMode = 'mock' | 'fetch'

export type RuntimeEnv = {
  apiMode: ApiMode
  apiBaseUrl: string
  apiVersion: string
  apiTimeoutMs: number
  siteUrl: string
  nodeEnv: 'development' | 'test' | 'production'
  release: string
}

export class EnvironmentValidationError extends Error {
  readonly issues: string[]

  constructor(issues: string[]) {
    super(`Invalid production environment:\n- ${issues.join('\n- ')}`)
    this.name = 'EnvironmentValidationError'
    this.issues = issues
  }
}

let cached: RuntimeEnv | null = null

function raw(name: string): string | undefined {
  return typeof process !== 'undefined' ? process.env[name]?.trim() : undefined
}

function absoluteHttpUrl(value: string): URL | null {
  try {
    const url = new URL(value)
    return url.protocol === 'http:' || url.protocol === 'https:' ? url : null
  } catch {
    return null
  }
}

export function validateEnvironment(): RuntimeEnv {
  if (cached) return cached

  const nodeEnv = (raw('NODE_ENV') ?? 'development') as RuntimeEnv['nodeEnv']
  const modeRaw = raw('API_MODE') ?? raw('NEXT_PUBLIC_API_MODE') ?? 'mock'
  const apiBaseUrl = raw('API_BASE_URL') ?? raw('NEXT_PUBLIC_API_BASE_URL') ?? ''
  const apiVersion = raw('API_VERSION') ?? raw('NEXT_PUBLIC_API_VERSION') ?? ''
  const timeoutRaw = raw('API_TIMEOUT') ?? raw('NEXT_PUBLIC_API_TIMEOUT_MS') ?? '15000'
  const siteUrl = raw('SITE_URL') ?? raw('NEXT_PUBLIC_SITE_URL') ?? 'https://fuurin.reiyuura.pw'
  const release = raw('RELEASE') ?? raw('APP_VERSION') ?? '0.1.0'
  const issues: string[] = []

  if (modeRaw !== 'mock' && modeRaw !== 'fetch') {
    issues.push('API_MODE must be "mock" or "fetch".')
  }

  const timeout = Number(timeoutRaw)
  if (!Number.isInteger(timeout) || timeout < 1_000 || timeout > 120_000) {
    issues.push('API_TIMEOUT must be an integer from 1000 to 120000 milliseconds.')
  }

  const parsedSite = absoluteHttpUrl(siteUrl)
  if (!parsedSite) issues.push('SITE_URL must be an absolute HTTP(S) URL.')

  if (modeRaw === 'fetch') {
    const parsedApi = absoluteHttpUrl(apiBaseUrl)
    if (!parsedApi) {
      issues.push('API_BASE_URL is required and must be an absolute HTTP(S) URL when API_MODE=fetch.')
    } else if (nodeEnv === 'production' && parsedApi.protocol !== 'https:') {
      issues.push('API_BASE_URL must use HTTPS in production.')
    }
  }

  // Required refinement: production cannot start partially configured.
  // This function is called by instrumentation.register() before the
  // application becomes ready. Throwing aborts process startup.
  if (issues.length > 0 && nodeEnv === 'production') {
    throw new EnvironmentValidationError(issues)
  }

  // Development keeps a clear warning but remains usable in mock mode.
  if (issues.length > 0) {
    console.warn(`[environment] ${issues.join(' ')}`)
  }

  cached = {
    apiMode: modeRaw === 'fetch' ? 'fetch' : 'mock',
    apiBaseUrl,
    apiVersion,
    apiTimeoutMs: Number.isInteger(timeout) ? timeout : 15_000,
    siteUrl: parsedSite?.toString().replace(/\/$/, '') ?? 'https://fuurin.reiyuura.pw',
    nodeEnv,
    release,
  }
  return cached
}

export function getEnvironment(): RuntimeEnv {
  return validateEnvironment()
}

export function resetEnvironmentForTests(): void {
  cached = null
}

// Build/start helper usable from scripts before `next start`.
if (typeof process !== 'undefined' && process.env.FUURIN_VALIDATE_ENV === '1') {
  validateEnvironment()
}
