/**
 * GET /api/copilot/life-health
 * Agregador central de saúde de vida — consolida todos os scores SWE-CI:
 *   - Life Health Score (Parallel Evaluator)
 *   - ANC Score (Average Normalized Change)
 *   - Maintainability Score
 *   - Top gaps críticos
 *   - Último pipeline semanal
 *
 * Query params: userId (default: "default")
 * Body (POST): { userId, context } — roda avaliação completa sob demanda
 */
import { NextRequest, NextResponse } from 'next/server';
import { evaluateAllAreas } from '@/services/agents/parallel-evaluator';
import { calculateANC } from '@/services/agents/anc-scorer';
import { scoreMaintainability } from '@/services/agents/maintainability-scorer';
import { analyzeGaps } from '@/services/agents/life-gap-analyzer';
import { getLastPipeline } from '@/services/agents/ci-weekly-pipeline';
import { getRuntimeConfig } from '@/services/agents/runtime-config';

export interface LifeHealthPayload {
  userId: string;
  evaluatedAt: string;
  lifeHealthScore: number;      // 0–100 (Parallel Evaluator)
  ancScore: number;             // 0–100 (ANC scorer, normalizado)
  maintainabilityScore: number; // 0–100
  maintainabilityVerdict: 'sustainable' | 'moderate_risk' | 'high_risk';
  maintainabilityWarnings: string[];
  topGaps: Array<{
    area: string;
    metric: string;
    gapMagnitude: number;       // 0–1
    priority: string;
    requirement: string;
  }>;
  criticalAreas: string[];
  topPriorities: string[];
  lastPipelineWeek?: string;    // ISO da semana do último pipeline
  lastPipelineSummary?: string;
  runtimeFlags: {
    parallelEvaluator: boolean;
    ancScore: boolean;
    maintainability: boolean;
    gapAnalyzer: boolean;
    ciWeeklyPipeline: boolean;
  };
}

function ancToPercent(ancScore: number): number {
  // ANC retorna -1 a +1; normalizar para 0-100
  const clamped = Math.max(-1, Math.min(1, ancScore));
  return Math.round(((clamped + 1) / 2) * 100);
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get('userId') ?? 'default';
  const runtimeConfig = getRuntimeConfig();

  try {
    // Usar contexto vazio para avaliação rápida sem dados de sessão
    const context: Record<string, unknown> = {};

    const [parallelResult, ancResult, maintResult, gapResult, lastPipeline] = await Promise.allSettled([
      runtimeConfig.enableParallelEvaluator
        ? evaluateAllAreas(userId, context, runtimeConfig.parallelEvalTokenBudgetPerArea)
        : Promise.resolve(null),
      runtimeConfig.enableANCScore
        ? calculateANC(userId, context)
        : Promise.resolve(null),
      runtimeConfig.enableMaintainabilityScore
        ? scoreMaintainability(context)
        : Promise.resolve(null),
      runtimeConfig.enableGapAnalyzer
        ? analyzeGaps(userId, context)
        : Promise.resolve(null),
      runtimeConfig.enableCIWeeklyPipeline
        ? Promise.resolve(getLastPipeline(userId))
        : Promise.resolve(null),
    ]);

    const parallel = parallelResult.status === 'fulfilled' ? parallelResult.value : null;
    const anc      = ancResult.status === 'fulfilled' ? ancResult.value : null;
    const maint    = maintResult.status === 'fulfilled' ? maintResult.value : null;
    const gaps     = gapResult.status === 'fulfilled' ? gapResult.value : null;
    const pipeline = lastPipeline.status === 'fulfilled' ? lastPipeline.value : null;

    const payload: LifeHealthPayload = {
      userId,
      evaluatedAt: new Date().toISOString(),
      lifeHealthScore: parallel?.lifeHealthScore ?? 0,
      ancScore: anc ? ancToPercent(anc.score) : 0,
      maintainabilityScore: maint?.score ?? 0,
      maintainabilityVerdict: maint?.verdict ?? 'moderate_risk',
      maintainabilityWarnings: maint?.warnings ?? [],
      topGaps: (gaps?.gaps ?? []).slice(0, 5).map((g) => ({
        area: g.area,
        metric: g.metric,
        gapMagnitude: g.gapMagnitude,
        priority: g.priority,
        requirement: g.requirement,
      })),
      criticalAreas: parallel?.criticalAreas ?? [],
      topPriorities: parallel?.topPriorities ?? [],
      lastPipelineWeek: pipeline?.weekOf,
      lastPipelineSummary: pipeline?.summary,
      runtimeFlags: {
        parallelEvaluator: runtimeConfig.enableParallelEvaluator,
        ancScore: runtimeConfig.enableANCScore,
        maintainability: runtimeConfig.enableMaintainabilityScore,
        gapAnalyzer: runtimeConfig.enableGapAnalyzer,
        ciWeeklyPipeline: runtimeConfig.enableCIWeeklyPipeline,
      },
    };

    return NextResponse.json(payload);
  } catch (err) {
    console.error('[life-health GET] Error:', err);
    return NextResponse.json({ error: 'Erro ao calcular Life Health Score' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as { userId?: string; context?: Record<string, unknown> };
    const userId = body.userId ?? 'default';
    const context = body.context ?? {};
    const runtimeConfig = getRuntimeConfig();

    const [parallelResult, ancResult, maintResult, gapResult] = await Promise.allSettled([
      evaluateAllAreas(userId, context, runtimeConfig.parallelEvalTokenBudgetPerArea),
      calculateANC(userId, context),
      scoreMaintainability(context),
      analyzeGaps(userId, context),
    ]);

    const parallel = parallelResult.status === 'fulfilled' ? parallelResult.value : null;
    const anc      = ancResult.status === 'fulfilled' ? ancResult.value : null;
    const maint    = maintResult.status === 'fulfilled' ? maintResult.value : null;
    const gaps     = gapResult.status === 'fulfilled' ? gapResult.value : null;
    const pipeline = getLastPipeline(userId);

    const payload: LifeHealthPayload = {
      userId,
      evaluatedAt: new Date().toISOString(),
      lifeHealthScore: parallel?.lifeHealthScore ?? 0,
      ancScore: anc ? ancToPercent(anc.score) : 0,
      maintainabilityScore: maint?.score ?? 0,
      maintainabilityVerdict: maint?.verdict ?? 'moderate_risk',
      maintainabilityWarnings: maint?.warnings ?? [],
      topGaps: (gaps?.gaps ?? []).slice(0, 5).map((g) => ({
        area: g.area,
        metric: g.metric,
        gapMagnitude: g.gapMagnitude,
        priority: g.priority,
        requirement: g.requirement,
      })),
      criticalAreas: parallel?.criticalAreas ?? [],
      topPriorities: parallel?.topPriorities ?? [],
      lastPipelineWeek: pipeline?.weekOf,
      lastPipelineSummary: pipeline?.summary,
      runtimeFlags: {
        parallelEvaluator: runtimeConfig.enableParallelEvaluator,
        ancScore: runtimeConfig.enableANCScore,
        maintainability: runtimeConfig.enableMaintainabilityScore,
        gapAnalyzer: runtimeConfig.enableGapAnalyzer,
        ciWeeklyPipeline: runtimeConfig.enableCIWeeklyPipeline,
      },
    };

    return NextResponse.json(payload);
  } catch (err) {
    console.error('[life-health POST] Error:', err);
    return NextResponse.json({ error: 'Erro ao calcular Life Health Score' }, { status: 500 });
  }
}
