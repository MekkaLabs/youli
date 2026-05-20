/**
 * GET  /api/system/seed — devolve o estado in-memory atual (admin only)
 * POST /api/system/seed — reseta o banco local para o estado seed (admin only)
 *
 * Antes ficava com bypass do middleware (`/api/system/seed` excluído do matcher),
 * permitindo qualquer um zerar dados. Agora exige usuário admin autenticado.
 */
import { NextResponse } from 'next/server';
import { readDb, resetDb } from '@/repositories/local-db';
import { jsonError, requireAdmin } from '@/lib/http';

export const runtime = 'nodejs';

export async function GET() {
  const auth = await requireAdmin();
  if (auth.error) return auth.response;
  try {
    return NextResponse.json(readDb());
  } catch (err) {
    return jsonError('Falha ao ler estado', 500, err, 'GET /api/system/seed');
  }
}

export async function POST() {
  const auth = await requireAdmin();
  if (auth.error) return auth.response;
  try {
    return NextResponse.json(resetDb());
  } catch (err) {
    return jsonError('Falha ao resetar seed', 500, err, 'POST /api/system/seed');
  }
}
