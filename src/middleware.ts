import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

/**
 * Middleware — protects /editor/* routes from unauthenticated access.
 *
 * The frontend cannot read the HttpOnly refresh cookie, so we check for
 * the cookie's *presence* (not validity). If missing, redirect to /login.
 * The backend API still enforces auth on every write endpoint — this
 * middleware only prevents the editor UI shell from rendering for guests.
 */

const COOKIE_NAME = 'fuurin_rt'

export function middleware(request: NextRequest) {
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