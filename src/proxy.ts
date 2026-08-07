import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

/**
 * Proxy (Next.js 16 — formerly "middleware") — protects /editor/* routes
 * from unauthenticated access.
 *
 * The frontend cannot read the HttpOnly refresh cookie, so we check for
 * the cookie's *presence* (not validity). If missing, redirect to /login.
 * The backend API still enforces auth on every write endpoint — this
 * proxy only prevents the editor UI shell from rendering for guests.
 *
 * Mock mode (local dev default): auth state lives in localStorage, which
 * is invisible here — the gate is skipped and the client-side guard
 * decides instead.
 */

const COOKIE_NAME = 'fuurin_rt'

export function proxy(request: NextRequest) {
  // NEXT_PUBLIC_* is inlined at build time; in dev this is 'mock'.
  if (process.env.NEXT_PUBLIC_API_MODE !== 'fetch') {
    return NextResponse.next()
  }

  const { pathname } = request.nextUrl

  // Only protect /editor paths.
  if (!pathname.startsWith('/editor')) {
    return NextResponse.next()
  }

  // Check for refresh cookie presence.
  const hasCookie = request.cookies.has(COOKIE_NAME)

  if (!hasCookie) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('next', pathname)
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/editor/:path*'],
}
