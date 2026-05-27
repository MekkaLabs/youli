import { NextRequest, NextResponse } from 'next/server';
import { createKickoffJob } from '@/services/agents/async-kickoff';
import type { UserContext } from '@/services/agents/agent-executor';
import { requireAuth } from '@/lib/http';
import { readDb } from '@/repositories/local-db';

export async function POST(req: NextRequest) {
  const auth = await requireAuth();
  if (auth.error) return auth.response;

  const body = await req.json().catch(() => ({}));
  const message = typeof body?.message === 'string' ? body.message.trim() : '';
  const rawContext = (body?.context || {}) as UserContext;
  const threadId = typeof body?.threadId === 'string' ? body.threadId : undefined;

  if (!message) {
    return NextResponse.json({ error: 'message obrigatoria' }, { status: 400 });
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

  const job = createKickoffJob({ message, context, threadId });
  return NextResponse.json({ jobId: job.id, status: job.status, threadId: job.threadId }, { status: 202 });
}

