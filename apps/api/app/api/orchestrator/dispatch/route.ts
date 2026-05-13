import { NextResponse } from 'next/server';
import { AioxOrchestrator } from '@youli/orchestrator';

const orchestrator = new AioxOrchestrator();

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as { intent?: string };
  const result = orchestrator.dispatchIntent(body.intent || 'daily planning');
  return NextResponse.json(result);
}
