import { NextResponse } from 'next/server';
import { createUser, getSessionCookieName, signSession, getSessionTtlSeconds } from '../../../../src/services/auth';
import { seedUserIfMissing } from '../../../../src/repositories/local-db';

// POST /api/auth/register — cria conta pública (role=user sempre)
export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as {
    name?: string;
    email?: string;
    password?: string;
  };

  const name = (body.name || '').trim();
  const email = (body.email || '').trim();
  const password = (body.password || '').trim();

  if (!name || !email || !password) {
    return NextResponse.json({ error: 'name, email e password são obrigatórios.' }, { status: 400 });
  }
  if (password.length < 6) {
    return NextResponse.json({ error: 'Senha deve ter ao menos 6 caracteres.' }, { status: 400 });
  }

  const result = await createUser({ name, email, password, role: 'user' });
  if ('error' in result) return NextResponse.json(result, { status: 400 });

  seedUserIfMissing(result.id, { name: result.name, email: result.email });

  const token = signSession(result);
  const res = NextResponse.json({ ok: true, user: result, token }, { status: 201 });
  res.cookies.set(getSessionCookieName(), token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: getSessionTtlSeconds(),
  });
  return res;
}
