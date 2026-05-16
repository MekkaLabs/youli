/**
 * ANC Life Score — SWE-CI-inspired Average Normalized Change
 * Mede o progresso acumulado em direção a metas ao longo de N iterações.
 * Fórmula adaptada de: https://github.com/SKYLENAGE-AI/SWE-CI
 */
import fs from 'node:fs';
import path from 'node:path';

export interface ANCDataPoint {
  area: string;
  metric: string;
  value: number;      // valor atual
  baseline: number;   // valor inicial (capturado no onboarding/primeiro check-in)
  target: number;     // valor alvo
  timestamp: string;
}

export interface ANCResult {
  userId: string;
  computedAt: string;
  score: number;               // -1 a +1 (análogo ao ANC do SWE-CI)
  scorePercent: number;        // 0-100 para display
  breakdown: Record<string, number>; // score por área
  trendDirection: 'improving' | 'stable' | 'declining';
  iterations: number;          // quantas medições foram usadas
  insight: string;             // frase de insight gerada
}

export interface ANCBaseline {
  userId: string;
  capturedAt: string;
  points: ANCDataPoint[];
}

const DATA_DIR = path.join(process.cwd(), 'src', 'repositories', '.data');

function getBaselinePath(userId: string): string {
  return path.join(DATA_DIR, `anc-baseline-${userId}.json`);
}

export function normalizedChange(
  current: number,
  baseline: number,
  target: number
): number {
  let result: number;
  if (current >= baseline) {
    result = (current - baseline) / Math.max(1, target - baseline);
  } else {
    result = (current - baseline) / Math.max(1, baseline);
  }
  // Clamp to [-1, 1]
  return Math.max(-1, Math.min(1, result));
}

export function saveBaseline(userId: string, points: ANCDataPoint[]): ANCBaseline {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  const baseline: ANCBaseline = {
    userId,
    capturedAt: new Date().toISOString(),
    points,
  };
  fs.writeFileSync(getBaselinePath(userId), JSON.stringify(baseline, null, 2));
  return baseline;
}

export function loadBaseline(userId: string): ANCBaseline | null {
  const filePath = getBaselinePath(userId);
  if (!fs.existsSync(filePath)) return null;
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8')) as ANCBaseline;
  } catch {
    return null;
  }
}

export function extractDataPoints(
  context: Record<string, unknown>
): Omit<ANCDataPoint, 'baseline' | 'timestamp'>[] {
  const points: Omit<ANCDataPoint, 'baseline' | 'timestamp'>[] = [];

  // Hábitos: streak atual vs target de 21 dias
  const habitos = context.habitos as Array<{ title?: string; streak?: number }> | undefined;
  if (Array.isArray(habitos) && habitos.length > 0) {
    const avgStreak = habitos.reduce((acc, h) => acc + (h.streak ?? 0), 0) / habitos.length;
    points.push({
      area: 'habitos',
      metric: 'streak_medio',
      value: avgStreak,
      target: 21,
    });
  }

  // Metas: progress % vs 100%
  const metas = context.metas as Array<{ title?: string; progress?: number }> | undefined;
  if (Array.isArray(metas) && metas.length > 0) {
    const avgProgress = metas.reduce((acc, g) => acc + (g.progress ?? 0), 0) / metas.length;
    points.push({
      area: 'metas',
      metric: 'progresso_medio',
      value: avgProgress,
      target: 100,
    });
  }

  // Tarefas: tarefas concluídas vs total
  const tarefas = context.tarefas as Array<{ status?: string }> | undefined;
  if (Array.isArray(tarefas) && tarefas.length > 0) {
    const concluidas = tarefas.filter((t) => t.status === 'done').length;
    points.push({
      area: 'tarefas',
      metric: 'taxa_conclusao',
      value: concluidas,
      target: tarefas.length,
    });
  }

  // Financeiro: savings rate vs target de 20%
  const financeiro = context.financeiro as { income?: number; expenses?: number } | undefined;
  if (financeiro && typeof financeiro.income === 'number' && typeof financeiro.expenses === 'number') {
    const savingsRate = Math.max(0, (financeiro.income - financeiro.expenses) / Math.max(1, financeiro.income) * 100);
    points.push({
      area: 'financeiro',
      metric: 'savings_rate',
      value: savingsRate,
      target: 20,
    });
  }

  // Fitness: weeklyActivities vs goalWeeklyActivities
  const fitness = context.fitness as { weeklyActivities?: number; goalWeeklyActivities?: number } | undefined;
  if (fitness && typeof fitness.weeklyActivities === 'number') {
    const goal = fitness.goalWeeklyActivities ?? 3;
    points.push({
      area: 'fitness',
      metric: 'atividades_semanais',
      value: fitness.weeklyActivities,
      target: goal,
    });
  }

  return points;
}

export function calculateANC(
  userId: string,
  context: Record<string, unknown>
): ANCResult {
  const currentPoints = extractDataPoints(context);
  const timestamp = new Date().toISOString();

  let baseline = loadBaseline(userId);

  if (!baseline || baseline.points.length === 0) {
    // Primeiro uso: criar baseline com valores atuais
    const initialPoints: ANCDataPoint[] = currentPoints.map((p) => ({
      ...p,
      baseline: p.value,
      timestamp,
    }));
    baseline = saveBaseline(userId, initialPoints);

    return {
      userId,
      computedAt: timestamp,
      score: 0,
      scorePercent: 50,
      breakdown: Object.fromEntries(currentPoints.map((p) => [p.area, 0])),
      trendDirection: 'stable',
      iterations: 1,
      insight: 'Baseline estabelecido. Continue acompanhando para ver sua evolução.',
    };
  }

  // Mapear pontos do baseline por chave area+metric
  const baselineMap = new Map(
    baseline.points.map((p) => [`${p.area}:${p.metric}`, p])
  );

  const changes: number[] = [];
  const breakdown: Record<string, number> = {};

  for (const current of currentPoints) {
    const key = `${current.area}:${current.metric}`;
    const baselinePoint = baselineMap.get(key);
    const baselineValue = baselinePoint?.baseline ?? current.value;

    const nc = normalizedChange(current.value, baselineValue, current.target);
    changes.push(nc);
    breakdown[current.area] = nc;
  }

  const score =
    changes.length > 0
      ? changes.reduce((a, b) => a + b, 0) / changes.length
      : 0;

  // Converter de [-1, 1] para [0, 100] para display
  const scorePercent = Math.round((score + 1) / 2 * 100);

  const trendDirection: ANCResult['trendDirection'] =
    score > 0.1 ? 'improving' : score < -0.1 ? 'declining' : 'stable';

  let insight: string;
  if (score > 0.5) {
    insight = `Excelente progresso! Você está ${(score * 100).toFixed(0)}% acima do seu baseline em média. Continue assim!`;
  } else if (score > 0.1) {
    insight = `Progresso positivo detectado (+${(score * 100).toFixed(0)}% vs baseline). Mantenha o ritmo!`;
  } else if (score < -0.3) {
    insight = `Atenção: queda de ${(Math.abs(score) * 100).toFixed(0)}% em relação ao baseline. Revise suas rotinas.`;
  } else if (score < -0.1) {
    insight = `Pequena queda em relação ao baseline. Identifique o que mudou e retome o foco.`;
  } else {
    insight = `Progresso estável em relação ao baseline. Tente aumentar a consistência para avançar.`;
  }

  return {
    userId,
    computedAt: timestamp,
    score: Math.round(score * 1000) / 1000,
    scorePercent,
    breakdown,
    trendDirection,
    iterations: baseline.points.length,
    insight,
  };
}

export function formatANCScore(result: ANCResult): string {
  const sign = result.score >= 0 ? '+' : '';
  const percentChange = (result.score * 100).toFixed(0);
  const directionLabel =
    result.trendDirection === 'improving'
      ? 'Melhorando'
      : result.trendDirection === 'declining'
      ? 'Caindo'
      : 'Estável';

  return `Progresso: ${sign}${percentChange}% acima do baseline → ${directionLabel}`;
}
