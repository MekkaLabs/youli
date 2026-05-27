import { NextRequest, NextResponse } from 'next/server';
import { runReplayBench } from '@/services/agents/replay-bench';
import type { UserContext } from '@/services/agents/agent-executor';
import { requireAdmin } from '@/lib/http';

export async function POST(req: NextRequest) {
  // Benchmark/dev tool → admin-only.
  const auth = await requireAdmin();
  if (auth.error) return auth.response;
  const body = await req.json().catch(() => ({}));
  const context = (body?.context || {}) as UserContext;
  return NextResponse.json(await runReplayBench(context));
}

