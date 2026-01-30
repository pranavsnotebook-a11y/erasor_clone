import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
    const authToken = request.cookies.get('auth_token');

    if (authToken?.value !== 'authenticated') {
        return NextResponse.redirect(new URL('/login', request.url));
    }

    return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard', '/teams/:path*', '/workspace/:path*'],
}