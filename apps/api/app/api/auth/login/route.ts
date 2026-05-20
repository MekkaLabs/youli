import { NextResponse } from 'next/server';
import { validateCredentials, getSessionCookieName, signSession, getSessionTtlSeconds } from '../../../../src/services/auth';

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as { email?: string; password?: string };
  const email = (body.email || '').trim();
  const password = (body.password || '').trim();

  const user = await validateCredentials(email, password);
  if (!user) {
    return NextResponse.json({ error: 'Credenciais inválidas' }, { status: 401 });
  }

  const token = signSession(user);
  // Retorna o token no body para clientes sem cookie-jar confiável (mobile).
  const res = NextResponse.json({ ok: true, user, token });
  res.cookies.set(getSessionCookieName(), token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: getSessionTtlSeconds(),
  });

  return res;
}
