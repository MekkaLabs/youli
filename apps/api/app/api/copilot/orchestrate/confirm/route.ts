import { NextRequest, NextResponse } from 'next/server';
import { runOrchestrator } from '@/services/agents/orchestrator';
import type { UserContext } from '@/services/agents/agent-executor';
import { claimLatestPendingApproval, finalizeApproval } from '@/services/agents/approval-queue';
import { requireAuth } from '@/lib/http';
import { readDb } from '@/repositories/local-db';

export async function POST(req: NextRequest) {
  // P0: confirma aprovação SEMPRE no contexto do usuário logado.
  const auth = await requireAuth();
  if (auth.error) return auth.response;

  const body = await req.json().catch(() => ({}));
  const threadId = typeof body?.threadId === 'string' ? body.threadId : '';
  const message = typeof body?.message === 'string' ? body.message : 'confirmado';
  const rawContext = (body?.context || {}) as UserContext;
  const orchestratorConfig = body?.orchestratorConfig;

  if (!threadId) {
    return NextResponse.json({ error: 'threadId obrigatorio' }, { status: 400 });
  }
  const claimed = claimLatestPendingApproval(threadId);
  if (!claimed) {
    return NextResponse.json({ error: 'nenhuma aprovacao pendente para esta thread' }, { status: 409 });
  }

  // Identidade do servidor sobrescreve o que vier do cliente.
  const profile = readDb(auth.user.id).profile;
  const context: UserContext = {
    ...rawContext,
    userId: auth.user.id,
    profile: {
      ...(rawContext.profile ?? {}),
      name: profile.name,
      objectives: profile.objectives,
      lifeAreas: profile.lifeAreas,
      humanDesign: profile.humanDesign,
      aiPersonalization: profile.aiPersonalization,
    },
  };

  try {
    const result = await runOrchestrator(message, context, orchestratorConfig, {
      threadId,
      allowResume: true,
    });
    finalizeApproval(claimed.id, 'approved');
    return NextResponse.json(result);
  } catch (err) {
    finalizeApproval(claimed.id, 'pending');
    const message = err instanceof Error ? err.message : 'falha na confirmacao';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
