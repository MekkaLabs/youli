import { NextResponse } from 'next/server';
import type { FitnessActivity } from '@youli/shared';
import { createFitnessActivity, listFitnessActivities } from '../../../../src/repositories/life-stream';

export async function GET() {
  return NextResponse.json(listFitnessActivities());
}

export async function POST(req: Request) {
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
