import { validateEnvironment } from '@/lib/config/env'

/**
 * Next.js invokes register() during server bootstrap, before accepting
 * requests. In production, validateEnvironment() throws on invalid
 * configuration, so process startup fails atomically — no partially
 * initialized repositories/providers and no first-request discovery.
 */
export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    validateEnvironment()
  }
}
