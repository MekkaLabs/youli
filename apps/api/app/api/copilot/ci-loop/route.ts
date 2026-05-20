import { NextRequest, NextResponse } from 'next/server';
import { runFullCILoop, getLastRun, getCILoopSummary } from '@/services/agents/life-ci-loop';
import { analyzeGaps } from '@/services/agents/life-gap-analyzer';
import { calculateANC } from '@/services/agents/anc-scorer';
import { jsonError, requireAuth } from '@/lib/http';

// GET /api/copilot/ci-loop — retorna último run + gaps + ANC do usuário autenticado
export async function GET(_request: NextRequest) {
  const auth = await requireAuth();
  if (auth.error) return auth.response;
  const userId = auth.user.id;

  try {
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
  } catch (err) {
    return jsonError('Erro interno ao buscar loop CI', 500, err, 'GET /api/copilot/ci-loop');
  }
}

// POST /api/copilot/ci-loop — executa loop CI completo para o usuário autenticado
// Body: { context: Record<string, unknown> }
export async function POST(request: NextRequest) {
  const auth = await requireAuth();
  if (auth.error) return auth.response;
  const userId = auth.user.id;

  try {
    const body = await request.json().catch(() => ({})) as { context?: Record<string, unknown> };
    const ctx = body.context ?? {};

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
  } catch (err) {
    return jsonError('Erro interno ao executar loop CI', 500, err, 'POST /api/copilot/ci-loop');
  }
}
