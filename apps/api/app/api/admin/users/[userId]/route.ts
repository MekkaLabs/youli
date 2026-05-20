/**
 * PATCH  /api/admin/users/:userId — edita nome/email/senha/role (admin only)
 * DELETE /api/admin/users/:userId — remove usuário (admin only)
 */
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { updateUser, deleteUser } from '@/services/auth';
import { jsonError, parseJsonBody, requireAdmin } from '@/lib/http';

export const runtime = 'nodejs';

const UpdateUserSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  email: z.string().email('email inválido').optional(),
  // senha vazia = manter atual; se fornecida, mínimo 6
  password: z.union([z.literal(''), z.string().min(6, 'senha deve ter no mínimo 6 caracteres')]).optional(),
  role: z.enum(['admin', 'user']).optional(),
});

export async function PATCH(req: Request, { params }: { params: Promise<{ userId: string }> }) {
  const auth = await requireAdmin();
  if (auth.error) return auth.response;

  const { userId } = await params;
  const parsed = await parseJsonBody(req, UpdateUserSchema);
  if (!parsed.ok) return parsed.response;
  const body = parsed.data;

  // Proteção: admin não pode rebaixar a SI MESMO (evita lockout acidental)
  if (userId === auth.user.id && body.role === 'user') {
    return NextResponse.json(
      { error: 'Você não pode rebaixar a si mesmo. Peça a outro admin.' },
      { status: 400 },
    );
  }

  try {
    const result = await updateUser(userId, body);
    if ('error' in result) return NextResponse.json(result, { status: 400 });
    return NextResponse.json({ user: result });
  } catch (err) {
    return jsonError('Erro ao atualizar usuário', 500, err, 'PATCH /api/admin/users/[userId]');
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ userId: string }> }) {
  const auth = await requireAdmin();
  if (auth.error) return auth.response;

  const { userId } = await params;
  if (userId === auth.user.id) {
    return NextResponse.json({ error: 'Não é possível deletar seu próprio usuário.' }, { status: 400 });
  }

  try {
    const result = await deleteUser(userId);
    if (result === false) {
      return NextResponse.json({ error: 'Usuário não encontrado.' }, { status: 404 });
    }
    if (typeof result === 'object' && 'error' in result) {
      return NextResponse.json(result, { status: 400 });
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    return jsonError('Erro ao remover usuário', 500, err, 'DELETE /api/admin/users/[userId]');
  }
}
