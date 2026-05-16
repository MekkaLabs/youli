import { NextRequest, NextResponse } from 'next/server';
import { inspectThread, replayThread } from '@/services/agents/trajectory';
import type { UserContext } from '@/services/agents/agent-executor';
import { requireAdminScope } from '@/lib/admin-scope';

export async function GET(req: NextRequest) {
  const auth = requireAdminScope(req);
  if (auth) return auth;
  const threadId = req.nextUrl.searchParams.get('threadId');
  if (!threadId) return NextResponse.json({ error: 'threadId obrigatorio' }, { status: 400 });
  return NextResponse.json(inspectThread(threadId));
}

export async function POST(req: NextRequest) {
  const auth = requireAdminScope(req);
  if (auth) return auth;
  const body = await req.json().catch(() => ({}));
  const threadId = typeof body?.threadId === 'string' ? body.threadId : '';
  if (!threadId) return NextResponse.json({ error: 'threadId obrigatorio' }, { status: 400 });
  const context = (body?.context || {}) as UserContext;
  return NextResponse.json(await replayThread(threadId, context));
}
