import { NextRequest, NextResponse } from 'next/server';
import { createKickoffJob } from '@/services/agents/async-kickoff';
import type { UserContext } from '@/services/agents/agent-executor';

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const message = typeof body?.message === 'string' ? body.message.trim() : '';
  const context = (body?.context || {}) as UserContext;
  const threadId = typeof body?.threadId === 'string' ? body.threadId : undefined;

  if (!message) {
    return NextResponse.json({ error: 'message obrigatoria' }, { status: 400 });
  }

  const job = createKickoffJob({ message, context, threadId });
  return NextResponse.json({ jobId: job.id, status: job.status, threadId: job.threadId }, { status: 202 });
}

