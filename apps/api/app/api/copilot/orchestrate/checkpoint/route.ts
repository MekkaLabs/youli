import { NextRequest, NextResponse } from 'next/server';
import { getGraphCheckpoint } from '@/services/agents/orchestrator-graph-store';

export async function GET(req: NextRequest) {
  const threadId = req.nextUrl.searchParams.get('threadId');
  if (!threadId) {
    return NextResponse.json({ error: 'threadId e obrigatorio' }, { status: 400 });
  }
  const checkpoint = getGraphCheckpoint(threadId);
  if (!checkpoint) {
    return NextResponse.json({ error: 'checkpoint nao encontrado' }, { status: 404 });
  }
  return NextResponse.json(checkpoint);
}

