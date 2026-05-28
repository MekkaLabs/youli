import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createKickoffJob } from '@/services/agents/async-kickoff';
import type { UserContext } from '@/services/agents/agent-executor';
import { parseJsonBody, requireAuth } from '@/lib/http';
import { readDb } from '@/repositories/local-db';

const KickoffSchema = z.object({
  message: z.string().trim().min(1, 'message obrigatoria').max(8000),
  context: z.record(z.string(), z.unknown()).default({}),
  threadId: z.string().max(128).optional(),
});

export async function POST(req: NextRequest) {
  const auth = await requireAuth();
  if (auth.error) return auth.response;

  const parsed = await parseJsonBody(req, KickoffSchema);
  if (!parsed.ok) return parsed.response;
  const { message, context: rawContextRaw, threadId } = parsed.data;
  const rawContext = rawContextRaw as unknown as UserContext;

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

