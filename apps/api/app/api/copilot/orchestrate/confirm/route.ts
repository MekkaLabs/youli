import { NextRequest, NextResponse } from 'next/server';
import { runOrchestrator } from '@/services/agents/orchestrator';
import type { UserContext } from '@/services/agents/agent-executor';
import { claimLatestPendingApproval, finalizeApproval } from '@/services/agents/approval-queue';

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const threadId = typeof body?.threadId === 'string' ? body.threadId : '';
  const message = typeof body?.message === 'string' ? body.message : 'confirmado';
  const context = (body?.context || {}) as UserContext;
  const orchestratorConfig = body?.orchestratorConfig;

  if (!threadId) {
    return NextResponse.json({ error: 'threadId obrigatorio' }, { status: 400 });
  }
  const claimed = claimLatestPendingApproval(threadId);
  if (!claimed) {
    return NextResponse.json({ error: 'nenhuma aprovacao pendente para esta thread' }, { status: 409 });
  }

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
