import { NextRequest, NextResponse } from 'next/server';

export function requireAdminScope(req: NextRequest): NextResponse | null {
  const token = process.env.YOULI_ADMIN_TOKEN;
  if (!token) {
    // Em desenvolvimento local, não bloquear se token ainda não foi configurado.
    if (process.env.NODE_ENV !== 'production') return null;
    return NextResponse.json({ error: 'admin token nao configurado' }, { status: 500 });
  }
  const incoming = req.headers.get('x-youli-admin-token') || '';
  if (!incoming || incoming !== token) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }
  return null;
}

