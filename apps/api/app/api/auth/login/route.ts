import { NextResponse } from 'next/server';
import { validateCredentials, getSessionCookieName } from '../../../../src/services/auth';

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as { email?: string; password?: string };
  const email = (body.email || '').trim();
  const password = (body.password || '').trim();

  const user = await validateCredentials(email, password);
  if (!user) {
    return NextResponse.json({ error: 'Credenciais inválidas' }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true, user });
  res.cookies.set(getSessionCookieName(), `${user.id}:${user.role || 'user'}`, {
    httpOnly: true,
    sameSite: 'lax',
    secure: false,
    path: '/',
    maxAge: 60 * 60 * 12
  });

  return res;
}
