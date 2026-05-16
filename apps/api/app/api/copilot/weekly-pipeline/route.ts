// GET /api/copilot/weekly-pipeline?userId=xxx — retorna último pipeline + histórico
// POST /api/copilot/weekly-pipeline — executa pipeline completo
// Body POST: { userId: string, context: Record<string, unknown> }
import { NextRequest, NextResponse } from 'next/server';
import {
  runWeeklyPipeline,
  loadPipelineHistory,
  getLastPipeline,
} from '@/services/agents/ci-weekly-pipeline';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId') ?? 'default';
    const last = getLastPipeline(userId);
    const history = loadPipelineHistory(userId);
    return NextResponse.json({ last, history, count: history.length });
  } catch (err) {
    console.error('[weekly-pipeline GET] Error:', err);
    return NextResponse.json(
      { error: 'Erro ao carregar histórico do pipeline' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId = 'default', context = {} } = body as {
      userId?: string;
      context?: Record<string, unknown>;
    };

    const result = await runWeeklyPipeline(userId, context);
    return NextResponse.json(result);
  } catch (err) {
    console.error('[weekly-pipeline POST] Error:', err);
    return NextResponse.json(
      { error: 'Erro ao executar pipeline semanal' },
      { status: 500 }
    );
  }
}
