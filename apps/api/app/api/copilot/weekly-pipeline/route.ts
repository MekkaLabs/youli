// GET /api/copilot/weekly-pipeline?userId=xxx — retorna último pipeline + histórico
// POST /api/copilot/weekly-pipeline — executa pipeline completo
// Body POST: { userId: string, context: Record<string, unknown> }
import { NextRequest, NextResponse } from 'next/server';
import {
  runWeeklyPipeline,
  loadPipelineHistory,
  getLastPipeline,
} from '@/services/agents/ci-weekly-pipeline';
import { jsonError, requireAuth } from '@/lib/http';

export async function GET(_req: NextRequest) {
  const auth = await requireAuth();
  if (auth.error) return auth.response;
  try {
    const userId = auth.user.id;
    const last = getLastPipeline(userId);
    const history = loadPipelineHistory(userId);
    return NextResponse.json({ last, history, count: history.length });
  } catch (err) {
    return jsonError('Erro ao carregar histórico do pipeline', 500, err, 'GET /api/copilot/weekly-pipeline');
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth();
  if (auth.error) return auth.response;
  try {
    const body = (await req.json().catch(() => ({}))) as { context?: Record<string, unknown> };
    const result = await runWeeklyPipeline(auth.user.id, body.context ?? {});
    return NextResponse.json(result);
  } catch (err) {
    return jsonError('Erro ao executar pipeline semanal', 500, err, 'POST /api/copilot/weekly-pipeline');
  }
}
