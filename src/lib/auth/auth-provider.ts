/**
 * Auth Provider — singleton facade.
 *
 * Every consumer (UI, hook, feature) imports `authProvider` from this
 * module. Sprint 13 swaps the right-hand side with a real provider
 * (NextAuth/Clerk/Auth.js) without touching any consumer.
 */

import type { AuthProvider } from '@/types/auth'
import { MockAuthProvider } from './mock-auth-provider'

export type { AuthProvider } from '@/types/auth'

export const authProvider: AuthProvider = new MockAuthProvider()
