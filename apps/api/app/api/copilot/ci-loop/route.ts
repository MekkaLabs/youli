import { NextRequest, NextResponse } from 'next/server';
import { runFullCILoop, getLastRun, getCILoopSummary } from '@/services/agents/life-ci-loop';
import { analyzeGaps } from '@/services/agents/life-gap-analyzer';
import { calculateANC } from '@/services/agents/anc-scorer';

// GET /api/copilot/ci-loop?userId=xxx — retorna último run + gaps + ANC
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { error: 'Parâmetro userId é obrigatório' },
        { status: 400 }
      );
    }

    const lastRun = getLastRun(userId);
    const summary = getCILoopSummary(userId);

    // Calcular gaps e ANC com base no contexto do último run, se disponível
    const lastContext = lastRun
      ? (lastRun.phases.find((p) => p.phase === 'assess')?.output ?? {})
      : {};

    const [gapsResult, ancResult] = await Promise.allSettled([
      Promise.resolve(analyzeGaps(userId, lastContext as Record<string, unknown>)),
      Promise.resolve(calculateANC(userId, lastContext as Record<string, unknown>)),
    ]);

    const gaps = gapsResult.status === 'fulfilled' ? gapsResult.value : null;
    const ancScore = ancResult.status === 'fulfilled' ? ancResult.value : null;

    return NextResponse.json({
      lastRun,
      gaps,
      ancScore,
      summary,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro interno ao buscar loop CI' },
      { status: 500 }
    );
  }
}

// POST /api/copilot/ci-loop — executa loop CI completo
// Body: { userId: string, context: Record<string, unknown> }
export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as { userId?: string; context?: Record<string, unknown> };
    const { userId, context } = body;

    if (!userId) {
      return NextResponse.json(
        { error: 'Campo userId é obrigatório no body' },
        { status: 400 }
      );
    }

    const ctx = context ?? {};

    const [ciRunResult, gapsResult, ancResult] = await Promise.allSettled([
      runFullCILoop(userId, ctx),
      Promise.resolve(analyzeGaps(userId, ctx)),
      Promise.resolve(calculateANC(userId, ctx)),
    ]);

    const ciRun = ciRunResult.status === 'fulfilled' ? ciRunResult.value : null;
    const gaps = gapsResult.status === 'fulfilled' ? gapsResult.value : null;
    const ancScore = ancResult.status === 'fulfilled' ? ancResult.value : null;

    const errors: string[] = [];
    if (ciRunResult.status === 'rejected') {
      errors.push(`CI Loop: ${String(ciRunResult.reason)}`);
    }
    if (gapsResult.status === 'rejected') {
      errors.push(`Gap Analyzer: ${String(gapsResult.reason)}`);
    }
    if (ancResult.status === 'rejected') {
      errors.push(`ANC Score: ${String(ancResult.reason)}`);
    }

    return NextResponse.json(
      {
        ciRun,
        gaps,
        ancScore,
        summary: ciRun?.summary ?? getCILoopSummary(userId),
        errors: errors.length > 0 ? errors : undefined,
      },
      { status: ciRun ? 200 : 500 }
    );
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro interno ao executar loop CI' },
      { status: 500 }
    );
  }
}
