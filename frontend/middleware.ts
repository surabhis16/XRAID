import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
    const token = request.cookies.get('xraid_token')?.value
    const { pathname } = request.nextUrl

    const isProtected = pathname.startsWith('/dashboard') || pathname.startsWith('/upload')
    const isAuthPage = pathname === '/login'

    if (isProtected && !token) {
        return NextResponse.redirect(new URL('/login', request.url))
    }

    if (isAuthPage && token) {
        return NextResponse.redirect(new URL('/dashboard', request.url))
    }

    return NextResponse.next()
}

export const config = {
    matcher: ['/dashboard/:path*', '/upload/:path*', '/login']
}