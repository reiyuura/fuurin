const base = process.env.VERIFY_BASE_URL ?? 'http://127.0.0.1:3000'
const checks = [
  ['/', 200],
  ['/albums', 200],
  ['/login', 200],
  ['/media', 200],
  ['/timeline', 200],
  ['/sitemap.xml', 200],
  ['/robots.txt', 200],
  ['/api/health', 200],
  ['/this-route-does-not-exist', 404],
]

for (const [pathname, expected] of checks) {
  const response = await fetch(new URL(pathname, base), { redirect: 'manual' })
  if (response.status !== expected) {
    throw new Error(`${pathname}: expected ${expected}, received ${response.status}`)
  }
  console.log(`${pathname}: ${response.status}`)
}

const response = await fetch(new URL('/', base))
const requiredHeaders = [
  'content-security-policy',
  'x-frame-options',
  'x-content-type-options',
  'referrer-policy',
  'permissions-policy',
]
for (const header of requiredHeaders) {
  if (!response.headers.get(header)) throw new Error(`Missing security header: ${header}`)
}

const health = await fetch(new URL('/api/health', base)).then((r) => r.json())
for (const key of ['status', 'version', 'uptime', 'environment', 'timestamp']) {
  if (!(key in health)) throw new Error(`Health response missing ${key}`)
}
console.log('Production verification passed.')
