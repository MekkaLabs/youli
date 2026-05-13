import { NextResponse } from 'next/server';
import { getSessionCookieName } from '../../../../src/services/auth';

export async function POST() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(getSessionCookieName(), '', {
    httpOnly: true,
    sameSite: 'lax',
    secure: false,
    path: '/',
    maxAge: 0
  });
  return res;
}
