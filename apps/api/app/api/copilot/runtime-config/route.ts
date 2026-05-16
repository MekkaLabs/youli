import { NextRequest, NextResponse } from 'next/server';
import { getRuntimeConfig, updateRuntimeConfig } from '@/services/agents/runtime-config';

export async function GET() {
  return NextResponse.json(getRuntimeConfig());
}

export async function PATCH(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  return NextResponse.json(updateRuntimeConfig(body || {}));
}

