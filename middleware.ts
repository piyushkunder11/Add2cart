import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Protect admin routes (except login)
  if (pathname.startsWith('/admin') && pathname !== '/admin/login') {
    // Check for auth token/session
    // In a real app, you'd check for a valid session cookie or JWT
    // For now, we'll allow access but you should implement proper auth checking
    
    // Example: Check for session cookie
    // const session = request.cookies.get('admin_session')
    // if (!session) {
    //   return NextResponse.redirect(new URL('/admin/login', request.url))
    // }
    
    // For demo purposes, we'll let it through
    // In production, implement proper session checking here
  }

  return NextResponse.next()
}

export const config = {
  matcher: '/admin/:path*',
}

