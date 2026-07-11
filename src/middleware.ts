import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const sessionCookie = request.cookies.get('neosol_session')

  // Public paths that do not require authentication
  const isPublicPath = 
    pathname === '/login' || 
    pathname.startsWith('/api/auth/login')

  // Ignore static assets, next internals, and public logo assets
  const isStaticAsset =
    pathname.startsWith('/_next') ||
    pathname.includes('.') ||
    pathname.startsWith('/favicon.ico')

  if (isStaticAsset) {
    return NextResponse.next()
  }

  // Removed redirect logic to prevent ERR_TOO_MANY_REDIRECTS loops with stale cookies.
  // Users with a cookie who go to /login will simply see the login page again.

  // If not authenticated and trying to access a secure path, redirect to login
  if (!sessionCookie && !isPublicPath) {
    const loginUrl = new URL('/login', request.url)
    // Optional: save the target path to redirect back after login
    loginUrl.searchParams.set('callbackUrl', pathname)
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
}

// Limit the middleware to page routes and API routes
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api/auth/login (public login API)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api/auth/login|_next/static|_next/image|favicon.ico).*)',
  ],
}
