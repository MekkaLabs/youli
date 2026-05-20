/**
 * DELETE /api/memory/[id]      — remove uma memória do usuário autenticado
 * DELETE /api/memory/[id]?externalId=foo — remove por externalId (alternativo)
 *
 * Só permite remover memórias do PRÓPRIO usuário (RLS por código).
 * Retorna 404 se a memória não existe ou não pertence ao usuário.
 *
 * Nota: remove do connector local (LocalMemoryConnector). A indexação
 * em pgvector/Zep não é desfeita aqui — vai expirar pelo TTL natural
 * ou ser sobrescrita no próximo upsert do mesmo `externalId`.
 */
import { NextRequest, NextResponse } from 'next/server';
import { getMemoryConnector } from '@/services/kernel/memory-connectors';
import { jsonError, requireAuth } from '@/lib/http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth();
  if (auth.error) return auth.response;

  const { id } = await ctx.params;
  if (!id) {
    return NextResponse.json({ error: 'id obrigatório' }, { status: 400 });
  }

  try {
    const connector = getMemoryConnector();
    const externalId = req.nextUrl.searchParams.get('externalId') ?? undefined;

    // Se externalId foi passado, tenta resolver para o id real antes de remover.
    let targetId = id;
    if (externalId) {
      const matches = await connector.list({ userId: auth.user.id, limit: 5000 });
      const found = matches.find((m) => m.externalId === externalId);
      if (!found) {
        return NextResponse.json({ error: 'memória não encontrada' }, { status: 404 });
      }
      targetId = found.id;
    }

    const removed = await connector.remove(auth.user.id, targetId);
    if (!removed) {
      return NextResponse.json({ error: 'memória não encontrada' }, { status: 404 });
    }
    return NextResponse.json({ ok: true, id: targetId, externalId });
  } catch (err) {
    return jsonError('Erro ao remover memória', 500, err, 'DELETE /api/memory/[id]');
  }
}
