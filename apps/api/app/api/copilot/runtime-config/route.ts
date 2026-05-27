import { NextRequest, NextResponse } from 'next/server';
import { getRuntimeConfig, updateRuntimeConfig } from '@/services/agents/runtime-config';
import { requireAdmin } from '@/lib/http';

export async function GET() {
  return NextResponse.json(getRuntimeConfig());
}

export async function PATCH(req: NextRequest) {
  // Config global de runtime → admin-only.
  const auth = await requireAdmin();
  if (auth.error) return auth.response;
  const body = await req.json().catch(() => ({}));
  return NextResponse.json(updateRuntimeConfig(body || {}));
}

