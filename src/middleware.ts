import { withAuth } from 'next-auth/middleware'
import { NextResponse } from 'next/server'
import { hasBookingAccess, hasKamperAccess } from '@/lib/access'

export default withAuth(
  function middleware(req) {
    const { pathname } = req.nextUrl
    const token = req.nextauth.token

    if (token?.mustChangePassword && pathname !== '/change-password') {
      return NextResponse.redirect(new URL('/change-password', req.url))
    }

    if (pathname.startsWith('/admin') && token?.role !== 'ADMIN') {
      return NextResponse.redirect(new URL('/booking', req.url))
    }

    if (token && pathname.startsWith('/booking') && !hasBookingAccess(token)) {
      return NextResponse.redirect(new URL(hasKamperAccess(token) ? '/kamper' : '/login', req.url))
    }

    if (token && pathname.startsWith('/kamper') && !hasKamperAccess(token)) {
      return NextResponse.redirect(new URL(hasBookingAccess(token) ? '/booking' : '/login', req.url))
    }
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const { pathname } = req.nextUrl
        if (pathname.startsWith('/login') || pathname.startsWith('/register')) return true
        return !!token
      },
    },
  }
)

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
}
