/**
 * POST /api/simulate/what-if
 * Simula cenário "E se eu fizer X mudança?"
 * Body: { snapshot, changes, horizonDays }
 */
import { NextRequest, NextResponse } from 'next/server';
import { runWhatIfSimulation, LifeSnapshot, WhatIfChange, SimulationHorizon } from '@/services/simulation/life-simulator';

export async function POST(req: NextRequest) {
  try {
    const { snapshot, changes, horizonDays = 90 } = await req.json() as {
      snapshot: LifeSnapshot;
      changes: WhatIfChange[];
      horizonDays: SimulationHorizon;
    };

    if (!changes?.length) {
      return NextResponse.json({ error: 'changes é obrigatório' }, { status: 400 });
    }

    const result = await runWhatIfSimulation(snapshot, changes, horizonDays);
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json({ error: 'Erro no what-if' }, { status: 500 });
  }
}
