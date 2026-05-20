import { NextResponse } from 'next/server';
import type { FitnessActivity } from '@youli/shared';
import { createFitnessActivity, listFitnessActivities } from '../../../../src/repositories/life-stream';
import { requireAuth } from '@/lib/http';

export async function GET() {
  const auth = await requireAuth();
  if (auth.error) return auth.response;
  return NextResponse.json(listFitnessActivities());
}

export async function POST(req: Request) {
  const auth = await requireAuth();
  if (auth.error) return auth.response;
  const body = (await req.json()) as Partial<FitnessActivity>;
  const created = createFitnessActivity({
    id: body.id || `fit-${Date.now()}`,
    source: body.source || 'mock',
    type: body.type || 'Treino',
    durationMin: body.durationMin ?? 30,
    intensity: body.intensity || 'medium',
    startedAt: body.startedAt || new Date().toISOString()
  });
  return NextResponse.json(created, { status: 201 });
}
