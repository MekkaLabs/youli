import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const openPaths = ['/login', '/api/auth/login', '/api/auth/logout', '/api/auth/me', '/_next', '/favicon.ico'];

  if (openPaths.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    return NextResponse.next();
  }

  if (pathname.startsWith('/system') || pathname === '/') {
    const token = req.cookies.get('youli_session')?.value;
    if (!token) {
      const url = req.nextUrl.clone();
      url.pathname = '/login';
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api/system/seed).*)']
};
