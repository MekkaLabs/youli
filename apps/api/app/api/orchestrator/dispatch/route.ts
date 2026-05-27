import { NextResponse } from 'next/server';
import { AioxOrchestrator } from '@youli/orchestrator';
import { requireAuth } from '@/lib/http';

const orchestrator = new AioxOrchestrator();

export async function POST(req: Request) {
  const auth = await requireAuth();
  if (auth.error) return auth.response;
  const body = (await req.json().catch(() => ({}))) as { intent?: string };
  const result = orchestrator.dispatchIntent(body.intent || 'daily planning');
  return NextResponse.json(result);
}
