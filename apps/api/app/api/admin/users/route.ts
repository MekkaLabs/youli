import { NextResponse } from 'next/server';
import { getCurrentUserFromCookie, getAllUsers, createUser } from '../../../../src/services/auth';

// GET /api/admin/users — lista todos os usuários (admin only)
export async function GET() {
  const me = await getCurrentUserFromCookie();
  if (!me) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
  if (me.role !== 'admin') return NextResponse.json({ error: 'Acesso negado.' }, { status: 403 });

  const users = getAllUsers();
  return NextResponse.json({ users });
}

// POST /api/admin/users — cria novo usuário (admin only)
export async function POST(req: Request) {
  const me = await getCurrentUserFromCookie();
  if (!me) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
  if (me.role !== 'admin') return NextResponse.json({ error: 'Acesso negado.' }, { status: 403 });

  const body = (await req.json().catch(() => ({}))) as {
    name?: string;
    email?: string;
    password?: string;
    role?: 'admin' | 'user';
  };

  if (!body.name || !body.email || !body.password) {
    return NextResponse.json({ error: 'name, email e password são obrigatórios.' }, { status: 400 });
  }

  const result = await createUser({
    name: body.name,
    email: body.email,
    password: body.password,
    role: body.role || 'user',
  });

  if ('error' in result) return NextResponse.json(result, { status: 400 });
  return NextResponse.json({ user: result }, { status: 201 });
}
