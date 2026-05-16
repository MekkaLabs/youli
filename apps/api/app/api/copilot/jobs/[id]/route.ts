import { NextRequest, NextResponse } from 'next/server';
import { getJob } from '@/services/agents/async-kickoff';

export async function GET(
  _req: NextRequest,
  routeContext: { params: Promise<{ id: string }> }
) {
  const { id } = await routeContext.params;
  const job = getJob(id);
  if (!job) {
    return NextResponse.json({ error: 'job nao encontrado' }, { status: 404 });
  }
  return NextResponse.json(job);
}

