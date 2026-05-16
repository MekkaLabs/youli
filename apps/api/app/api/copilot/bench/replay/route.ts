import { NextRequest, NextResponse } from 'next/server';
import { runReplayBench } from '@/services/agents/replay-bench';
import type { UserContext } from '@/services/agents/agent-executor';

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const context = (body?.context || {}) as UserContext;
  return NextResponse.json(await runReplayBench(context));
}

