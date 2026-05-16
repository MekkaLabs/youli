/**
 * CI Weekly Pipeline — SWE-CI-inspired Full CI Pipeline for Life
 * Pipeline completo que roda semanalmente (domingo às 21h).
 * Orquestra: Parallel Eval → Gap Analysis → Evolution Tracking → ANC → Requirements Docs
 */
import fs from 'node:fs';
import path from 'node:path';

import { evaluateAllAreas } from './parallel-evaluator';
import { calculateANC } from './anc-scorer';

export interface PipelinePhaseResult {
  phase: string;
  status: 'ok' | 'error' | 'skipped';
  durationMs: number;
  output: unknown;
  error?: string;
}

export interface WeeklyPipelineResult {
  id: string;            // pipeline_${Date.now()}
  weekOf: string;        // ISO da segunda-feira da semana
  userId: string;
  startedAt: string;
  completedAt: string;
  phases: PipelinePhaseResult[];
  lifeHealthScore: number;
  ancScore: number;
  topGaps: string[];        // top 3 gaps em texto
  weeklyPlan: string[];     // plano para a próxima semana
  nextWeekPriorities: string[];
  summary: string;
}

const DATA_DIR = path.join(process.cwd(), '.data');

function ensureDataDir(): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function getStorePath(userId: string): string {
  return path.join(DATA_DIR, `weekly-pipeline-${userId}.json`);
}

export function getWeekStart(date?: Date): string {
  const d = date ? new Date(date) : new Date();
  const day = d.getDay(); // 0 = Sunday, 1 = Monday ...
  const diff = day === 0 ? -6 : 1 - day; // ajusta para segunda-feira
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

async function runPhase(
  phaseName: string,
  fn: () => Promise<unknown> | unknown
): Promise<PipelinePhaseResult> {
  const start = Date.now();
  try {
    const output = await fn();
    return {
      phase: phaseName,
      status: 'ok',
      durationMs: Date.now() - start,
      output,
    };
  } catch (err) {
    return {
      phase: phaseName,
      status: 'error',
      durationMs: Date.now() - start,
      output: null,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

export async function runWeeklyPipeline(
  userId: string,
  context: Record<string, unknown>
): Promise<WeeklyPipelineResult> {
  const startedAt = new Date().toISOString();
  const weekOf = getWeekStart();
  const phases: PipelinePhaseResult[] = [];

  // Fase 1 — Parallel Eval
  const phase1 = await runPhase('parallel_eval', () =>
    evaluateAllAreas(userId, context)
  );
  phases.push(phase1);

  // Fase 2 — Gap Analysis (importação dinâmica para evitar ciclos)
  const phase2 = await runPhase('gap_analysis', async () => {
    const { analyzeGaps } = await import('./life-gap-analyzer');
    return analyzeGaps(userId, context);
  });
  phases.push(phase2);

  // Fase 3 — Evolution Tracking
  const phase3 = await runPhase('evolution_tracking', async () => {
    const { recordEvolutionPoint } = await import('./life-evolution-tracker');
    const areaScores =
      phase1.status === 'ok' && phase1.output
        ? (phase1.output as { areaResults: Record<string, { score: number }> }).areaResults
        : {};

    const points: unknown[] = [];
    for (const [area, result] of Object.entries(areaScores)) {
      const point = recordEvolutionPoint(userId, area, 'score', result.score, 'ci_loop');
      points.push(point);
    }
    return { recordedPoints: points.length };
  });
  phases.push(phase3);

  // Fase 4 — ANC Calculation
  const phase4 = await runPhase('anc_calculation', () => calculateANC(userId, context));
  phases.push(phase4);

  // Fase 5 — Requirements Generation
  const phase5 = await runPhase('requirements_generation', async () => {
    const { generateRequirementDoc } = await import('./requirements-doc-generator');

    const gapResult =
      phase2.status === 'ok' && phase2.output
        ? (phase2.output as { gaps: Array<{
            area: string;
            metric: string;
            currentValue: number | string;
            targetValue: number | string;
            gapMagnitude: number;
            priority: string;
            requirement: string;
            estimatedDays: number;
          }> })
        : { gaps: [] };

    const topGaps = gapResult.gaps.slice(0, 3);
    const docs = topGaps.map((gap) => generateRequirementDoc(gap));
    return { generatedDocs: docs.length, docs };
  });
  phases.push(phase5);

  const completedAt = new Date().toISOString();

  // Extrair resultados agregados
  const parallelResult = phase1.status === 'ok'
    ? (phase1.output as { lifeHealthScore: number; topPriorities: string[] })
    : { lifeHealthScore: 0, topPriorities: [] };

  const ancResult = phase4.status === 'ok'
    ? (phase4.output as { scorePercent: number })
    : { scorePercent: 0 };

  const gapOutput = phase2.status === 'ok'
    ? (phase2.output as { topRequirements?: string[] })
    : { topRequirements: [] };

  const topGaps = (gapOutput.topRequirements ?? []).slice(0, 3);
  const topPriorities = parallelResult.topPriorities.slice(0, 3);

  const weeklyPlan = [
    ...topPriorities,
    ...topGaps,
  ].slice(0, 5);

  const lifeHealthScore = parallelResult.lifeHealthScore;
  const ancScore = ancResult.scorePercent;

  const criticalCount = topGaps.length;
  const summary =
    `🔄 Pipeline CI Semanal — Semana de ${weekOf.slice(0, 10)}\n` +
    `🏥 Life Health Score: ${lifeHealthScore}/100 | ANC: ${ancScore}/100\n` +
    `⚠️ Top gaps críticos: ${criticalCount}\n` +
    `🎯 Plano da semana: ${weeklyPlan[0] ?? 'N/A'}`;

  const result: WeeklyPipelineResult = {
    id: `pipeline_${Date.now()}`,
    weekOf,
    userId,
    startedAt,
    completedAt,
    phases,
    lifeHealthScore,
    ancScore,
    topGaps,
    weeklyPlan,
    nextWeekPriorities: topPriorities,
    summary,
  };

  savePipelineResult(result);
  return result;
}

export function savePipelineResult(result: WeeklyPipelineResult): void {
  ensureDataDir();
  const history = loadPipelineHistory(result.userId);
  history.push(result);
  // Manter apenas as últimas 12 runs (3 meses)
  const trimmed = history.length > 12 ? history.slice(history.length - 12) : history;
  fs.writeFileSync(getStorePath(result.userId), JSON.stringify(trimmed, null, 2), 'utf-8');
}

export function loadPipelineHistory(userId: string): WeeklyPipelineResult[] {
  const filePath = getStorePath(userId);
  if (!fs.existsSync(filePath)) return [];
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf-8')) as WeeklyPipelineResult[];
  } catch {
    return [];
  }
}

export function getLastPipeline(userId: string): WeeklyPipelineResult | null {
  const history = loadPipelineHistory(userId);
  if (history.length === 0) return null;
  return history[history.length - 1];
}
