import { NextRequest, NextResponse } from 'next/server';
import { AUTH_COOKIE, authEnabled, expectedToken, safeEqual } from '@/lib/auth';

export const runtime = 'nodejs';

const attempts = new Map<string, { n: number; until: number }>();

export async function POST(req: NextRequest) {
  if (!authEnabled()) return NextResponse.json({ ok: true });
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'local';
  const a = attempts.get(ip);
  if (a && a.until > Date.now() && a.n >= 5) {
    return NextResponse.json({ error: 'Terlalu banyak percobaan. Coba lagi 5 menit lagi.' }, { status: 429 });
  }
  const { password } = (await req.json().catch(() => ({}))) as { password?: string };
  const ok = typeof password === 'string' && safeEqual(password, process.env.APP_PASSWORD || '');
  if (!ok) {
    const cur = a && a.until > Date.now() ? a : { n: 0, until: Date.now() + 5 * 60_000 };
    attempts.set(ip, { n: cur.n + 1, until: cur.until });
    return NextResponse.json({ error: 'Password salah' }, { status: 401 });
  }
  attempts.delete(ip);
  const res = NextResponse.json({ ok: true });
  res.cookies.set(AUTH_COOKIE, await expectedToken(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 180,
  });
  return res;
}
