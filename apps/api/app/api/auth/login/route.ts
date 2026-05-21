import { NextResponse } from 'next/server';
import { validateCredentials, getSessionCookieName, signSession, getSessionTtlSeconds } from '../../../../src/services/auth';
import { seedUserIfMissing } from '../../../../src/repositories/local-db';
import { enforceRateLimit } from '../../../../src/lib/rate-limit';

export async function POST(req: Request) {
  // Mitiga brute-force: 10 tentativas/min por IP.
  const limited = enforceRateLimit(req, 'login', 10, 60_000);
  if (limited) return limited;

  const body = (await req.json().catch(() => ({}))) as { email?: string; password?: string };
  const email = (body.email || '').trim();
  const password = (body.password || '').trim();

  const user = await validateCredentials(email, password);
  if (!user) {
    return NextResponse.json({ error: 'Credenciais inválidas' }, { status: 401 });
  }

  // Garante que o usuário tenha seu próprio banco inicializado com a identidade.
  seedUserIfMissing(user.id, { name: user.name, email: user.email });

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
