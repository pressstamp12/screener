import { NextRequest, NextResponse } from 'next/server';
import { AUTH_COOKIE, authEnabled, expectedToken, safeEqual } from '@/lib/auth';

const PUBLIC = ['/login', '/api/login', '/manifest.json', '/sw.js', '/favicon.ico'];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (!authEnabled()) return NextResponse.next();
  if (PUBLIC.includes(pathname) || pathname.startsWith('/icons/')) return NextResponse.next();

  const token = req.cookies.get(AUTH_COOKIE)?.value || '';
  if (token && safeEqual(token, await expectedToken())) return NextResponse.next();

  if (pathname.startsWith('/api/')) {
    return NextResponse.json({ error: 'Belum login' }, { status: 401 });
  }
  const url = req.nextUrl.clone();
  url.pathname = '/login';
  url.searchParams.set('next', pathname);
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ['/((?!_next/static|_next/image).*)'],
};
