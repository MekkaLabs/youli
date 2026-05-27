/**
 * POST /api/simulate/scenario
 * Simula a trajetória de vida para 30/60/90/180/365 dias
 * Body: { snapshot, horizonDays, scenarioType, orchestratorConfig }
 */
import { NextRequest, NextResponse } from 'next/server';
import { runLifeSimulation, runToTSimulation, LifeSnapshot, SimulationHorizon, ScenarioType } from '@/services/simulation/life-simulator';
import { getAreaGraphContext } from '@/services/graph/life-graph';
import { requireAuth } from '@/lib/http';

export async function POST(req: NextRequest) {
  const auth = await requireAuth();
  if (auth.error) return auth.response;
  try {
    const body = await req.json();
    const {
      snapshot,
      horizonDays = 90,
      scenarioType = 'current_trajectory',
      orchestratorName = 'Youli',
      mode,
    } = body as {
      snapshot: LifeSnapshot;
      horizonDays: SimulationHorizon;
      scenarioType: ScenarioType;
      orchestratorName?: string;
      mode?: 'tot' | 'standard';
    };

    // profileId vem SEMPRE do servidor (evita ler grafo de outro usuário).
    const profileId = auth.user.id;

    // Enriquece com contexto do GraphRAG do próprio usuário.
    try {
      const graphCtx = await getAreaGraphContext(profileId, 'dashboard', 0.4);
      if (graphCtx.summary) {
        snapshot.graphCorrelations = [graphCtx.summary];
      }
    } catch {}

    if (mode === 'tot') {
      const totResult = await runToTSimulation(snapshot, horizonDays, orchestratorName);
      return NextResponse.json(totResult);
    }

    const result = await runLifeSimulation(snapshot, horizonDays, scenarioType, undefined, orchestratorName);

    return NextResponse.json(result);
  } catch (err) {
    console.error('[/api/simulate/scenario]', err);
    return NextResponse.json({ error: 'Erro na simulação' }, { status: 500 });
  }
}
