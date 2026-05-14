/**
 * POST /api/simulate/scenario
 * Simula a trajetória de vida para 30/60/90/180/365 dias
 * Body: { snapshot, horizonDays, scenarioType, orchestratorConfig }
 */
import { NextRequest, NextResponse } from 'next/server';
import { runLifeSimulation, LifeSnapshot, SimulationHorizon, ScenarioType } from '@/services/simulation/life-simulator';
import { getAreaGraphContext } from '@/services/graph/life-graph';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      snapshot,
      horizonDays = 90,
      scenarioType = 'current_trajectory',
      orchestratorName = 'Youli',
      profileId,
    } = body as {
      snapshot: LifeSnapshot;
      horizonDays: SimulationHorizon;
      scenarioType: ScenarioType;
      orchestratorName?: string;
      profileId?: string;
    };

    // Enriquece com contexto do GraphRAG
    if (profileId) {
      try {
        const graphCtx = await getAreaGraphContext(profileId, 'dashboard', 0.4);
        if (graphCtx.summary) {
          snapshot.graphCorrelations = [graphCtx.summary];
        }
      } catch {}
    }

    const result = await runLifeSimulation(snapshot, horizonDays, scenarioType, undefined, orchestratorName);

    return NextResponse.json(result);
  } catch (err) {
    console.error('[/api/simulate/scenario]', err);
    return NextResponse.json({ error: 'Erro na simulação' }, { status: 500 });
  }
}
