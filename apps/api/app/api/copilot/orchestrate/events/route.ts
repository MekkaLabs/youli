import { NextRequest, NextResponse } from 'next/server';
import { getThreadEvents } from '@/services/agents/event-stream';
import { requireAdminScope } from '@/lib/admin-scope';

export async function GET(req: NextRequest) {
  const auth = requireAdminScope(req);
  if (auth) return auth;
  const threadId = req.nextUrl.searchParams.get('threadId');
  if (!threadId) {
    return NextResponse.json({ error: 'threadId e obrigatorio' }, { status: 400 });
  }
  return NextResponse.json({ threadId, events: getThreadEvents(threadId, 250) });
}
