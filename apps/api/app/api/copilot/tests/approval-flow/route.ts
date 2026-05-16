import { NextRequest, NextResponse } from 'next/server';
import { runOrchestrator } from '@/services/agents/orchestrator';
import { claimLatestPendingApproval, finalizeApproval, listApprovals } from '@/services/agents/approval-queue';
import { requireAdminScope } from '@/lib/admin-scope';

export async function POST(req: NextRequest) {
  const auth = requireAdminScope(req);
  if (auth) return auth;

  const threadId = `test_thread_${Date.now()}`;
  const context = {};

  // 1) dispara interrupcao sensivel
  const first = await runOrchestrator('quero transferir pix agora', context, undefined, { threadId });
  const pending = listApprovals('pending').filter((x) => x.threadId === threadId);

  // 2) confirma e retoma
  const claimed = claimLatestPendingApproval(threadId);
  const second = await runOrchestrator('confirmado', context, undefined, { threadId, allowResume: true });
  if (claimed) finalizeApproval(claimed.id, 'approved');
  const approved = listApprovals('approved').filter((x) => x.threadId === threadId);

  return NextResponse.json({
    ok: true,
    checks: {
      interrupted: Boolean(first.interrupted?.reason),
      pendingApprovalCreated: pending.length > 0,
      resumedResponse: Boolean(second.primaryAgent?.message),
      approvedCountAfterResume: approved.length > 0,
    },
    threadId,
  });
}
