import { NextResponse } from 'next/server';
import { getCurrentUserFromCookie, updateUser, deleteUser } from '../../../../../src/services/auth';

// PATCH /api/admin/users/:userId — edita nome/email/senha/role
export async function PATCH(req: Request, { params }: { params: Promise<{ userId: string }> }) {
  const me = await getCurrentUserFromCookie();
  if (!me) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
  if (me.role !== 'admin') return NextResponse.json({ error: 'Acesso negado.' }, { status: 403 });

  const { userId } = await params;
  const body = await req.json().catch(() => ({}));
  const result = await updateUser(userId, body);

  if ('error' in result) return NextResponse.json(result, { status: 400 });
  return NextResponse.json({ user: result });
}

// DELETE /api/admin/users/:userId — remove usuário
export async function DELETE(_req: Request, { params }: { params: Promise<{ userId: string }> }) {
  const me = await getCurrentUserFromCookie();
  if (!me) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
  if (me.role !== 'admin') return NextResponse.json({ error: 'Acesso negado.' }, { status: 403 });

  const { userId } = await params;
  if (userId === me.id) return NextResponse.json({ error: 'Não é possível deletar seu próprio usuário.' }, { status: 400 });

  const ok = await deleteUser(userId);
  if (!ok) return NextResponse.json({ error: 'Usuário não encontrado.' }, { status: 404 });
  return NextResponse.json({ ok: true });
}
