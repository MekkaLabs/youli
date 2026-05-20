/**
 * GET  /api/admin/users — lista todos os usuários (admin only)
 * POST /api/admin/users — cria novo usuário (admin only)
 */
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getAllUsers, createUser } from '@/services/auth';
import { jsonError, parseJsonBody, requireAdmin } from '@/lib/http';

export const runtime = 'nodejs';

const CreateUserSchema = z.object({
  name: z.string().min(1, 'name é obrigatório').max(120),
  email: z.string().email('email inválido'),
  password: z.string().min(6, 'senha deve ter no mínimo 6 caracteres'),
  role: z.enum(['admin', 'user']).optional(),
});

export async function GET() {
  const auth = await requireAdmin();
  if (auth.error) return auth.response;
  try {
    return NextResponse.json({ users: getAllUsers() });
  } catch (err) {
    return jsonError('Erro ao listar usuários', 500, err, 'GET /api/admin/users');
  }
}

export async function POST(req: Request) {
  const auth = await requireAdmin();
  if (auth.error) return auth.response;

  const parsed = await parseJsonBody(req, CreateUserSchema);
  if (!parsed.ok) return parsed.response;

  try {
    const result = await createUser(parsed.data);
    if ('error' in result) return NextResponse.json(result, { status: 400 });
    return NextResponse.json({ user: result }, { status: 201 });
  } catch (err) {
    return jsonError('Erro ao criar usuário', 500, err, 'POST /api/admin/users');
  }
}
