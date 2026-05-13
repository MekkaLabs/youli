import { NextResponse } from 'next/server';
import type { DailyInsight } from '@youli/shared';
import { createInsight, listInsights } from '../../../../src/repositories/store';

export async function GET() {
  const insights = await listInsights();
  return NextResponse.json(insights);
}

export async function POST(req: Request) {
  const body = (await req.json()) as Partial<DailyInsight>;
  const created = await createInsight({
    id: body.id || '',
    createdAt: body.createdAt || new Date().toISOString(),
    summary: body.summary || 'Novo insight',
    actions: body.actions || [],
    energy: body.energy || 'medium'
  });
  return NextResponse.json(created, { status: 201 });
}
