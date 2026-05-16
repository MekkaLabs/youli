import { NextRequest, NextResponse } from 'next/server';
import { listApprovals, updateApproval } from '@/services/agents/approval-queue';
import { requireAdminScope } from '@/lib/admin-scope';

export async function GET(req: NextRequest) {
  const auth = requireAdminScope(req);
  if (auth) return auth;
  const status = req.nextUrl.searchParams.get('status') as 'pending' | 'processing' | 'approved' | 'rejected' | null;
  return NextResponse.json({ items: listApprovals(status || undefined) });
}

export async function PATCH(req: NextRequest) {
  const auth = requireAdminScope(req);
  if (auth) return auth;
  const body = await req.json().catch(() => ({}));
  const id = typeof body?.id === 'string' ? body.id : '';
  const status = body?.status as 'approved' | 'rejected' | undefined;
  if (!id || !status) return NextResponse.json({ error: 'id e status obrigatorios' }, { status: 400 });
  const item = updateApproval(id, status);
  if (!item) return NextResponse.json({ error: 'item nao encontrado' }, { status: 404 });
  return NextResponse.json(item);
}
