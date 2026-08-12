const env = process.env
const nodeEnv = env.NODE_ENV ?? 'development'
const mode = env.API_MODE ?? env.NEXT_PUBLIC_API_MODE ?? (nodeEnv === 'production' ? 'fetch' : 'mock')
const timeoutRaw = env.API_TIMEOUT ?? env.NEXT_PUBLIC_API_TIMEOUT_MS ?? '15000'
const apiUrl = env.API_BASE_URL ?? env.NEXT_PUBLIC_API_BASE_URL ?? ''
const siteUrl = env.SITE_URL ?? env.NEXT_PUBLIC_SITE_URL ?? 'https://fuurin.reiyuura.pw'
const issues = []
if (nodeEnv === 'production' && !env.API_MODE && !env.NEXT_PUBLIC_API_MODE) {
  issues.push('API_MODE must be explicitly set in production')
}

if (!['mock', 'fetch'].includes(mode)) issues.push('API_MODE must be mock or fetch')
const timeout = Number(timeoutRaw)
if (!Number.isInteger(timeout) || timeout < 1000 || timeout > 120000) {
  issues.push('API_TIMEOUT must be an integer between 1000 and 120000')
}
try { new URL(siteUrl) } catch { issues.push('SITE_URL must be an absolute URL') }
if (mode === 'fetch') {
  try {
    const parsed = new URL(apiUrl)
    if (nodeEnv === 'production' && parsed.protocol !== 'https:') issues.push('API_BASE_URL must use HTTPS in production')
  } catch { issues.push('API_BASE_URL must be an absolute URL when API_MODE=fetch') }
}

if (issues.length) {
  console.error(`Invalid environment:\n- ${issues.join('\n- ')}`)
  process.exit(1)
}
console.log(`Environment valid (${nodeEnv}, ${mode}).`)
