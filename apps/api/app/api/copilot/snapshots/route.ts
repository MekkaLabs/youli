import { NextRequest, NextResponse } from 'next/server';
import { getSnapshots } from '@/services/agents/context-snapshots';

export async function GET(req: NextRequest) {
  const threadId = req.nextUrl.searchParams.get('threadId');
  if (!threadId) return NextResponse.json({ error: 'threadId obrigatorio' }, { status: 400 });
  return NextResponse.json({ threadId, snapshots: getSnapshots(threadId) });
}

