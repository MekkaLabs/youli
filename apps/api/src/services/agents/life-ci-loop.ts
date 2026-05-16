/**
 * Life CI Loop — SWE-CI-inspired Continuous Integration Loop for Life
 * Loop fechado: Assess → Gap → Plan → Execute → Review
 * Inspirado no CI Loop do SWE-CI (Run Tests → Define Requirements → Modify Code)
 */
import fs from 'node:fs';
import path from 'node:path';

export type CIPhase = 'assess' | 'gap' | 'plan' | 'execute' | 'review';

export interface CIPhaseResult {
  phase: CIPhase;
  startedAt: string;
  endedAt: string;
  output: Record<string, unknown>;
  status: 'ok' | 'skipped' | 'error';
  error?: string;
}

export interface CILoopRun {
  id: string;                // ci_${Date.now()}
  userId: string;
  iteration: number;         // quantas vezes este loop rodou para este usuário
  startedAt: string;
  completedAt: string | null;
  phases: CIPhaseResult[];
  currentPhase: CIPhase | 'done';
  summary: string;           // texto human-friendly do resultado
  areaScores: Record<string, number>;  // score 0-100 por área
  criticalGaps: string[];    // top 3 gaps críticos identificados
  weeklyPlan: string[];      // ações para a próxima semana
}

export interface CILoopStore {
  userId: string;
  runs: CILoopRun[];
  lastRunAt: string | null;
}

const DATA_DIR = path.join(process.cwd(), 'src', 'repositories', '.data');

function getStorePath(userId: string): string {
  return path.join(DATA_DIR, `ci-loop-${userId}.json`);
}

export function loadCIStore(userId: string): CILoopStore {
  const filePath = getStorePath(userId);
  if (!fs.existsSync(filePath)) {
    return { userId, runs: [], lastRunAt: null };
  }
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8')) as CILoopStore;
  } catch {
    return { userId, runs: [], lastRunAt: null };
  }
}

export function saveCIRun(run: CILoopRun, userId: string): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  const store = loadCIStore(userId);
  store.runs.push(run);
  // Manter apenas as últimas 10 runs
  if (store.runs.length > 10) {
    store.runs = store.runs.slice(store.runs.length - 10);
  }
  store.lastRunAt = run.completedAt ?? run.startedAt;
  fs.writeFileSync(getStorePath(userId), JSON.stringify(store, null, 2));
}

export function getLastRun(userId: string): CILoopRun | null {
  const store = loadCIStore(userId);
  if (store.runs.length === 0) return null;
  return store.runs[store.runs.length - 1];
}

export function getCILoopSummary(userId: string): string {
  const last = getLastRun(userId);
  if (!last) return 'Nenhum loop CI executado ainda.';
  return last.summary;
}

export function createCIRun(userId: string): CILoopRun {
  const store = loadCIStore(userId);
  const iteration = store.runs.length + 1;
  return {
    id: `ci_${Date.now()}`,
    userId,
    iteration,
    startedAt: new Date().toISOString(),
    completedAt: null,
    phases: [],
    currentPhase: 'assess',
    summary: '',
    areaScores: {},
    criticalGaps: [],
    weeklyPlan: [],
  };
}

function computeAreaScores(context: Record<string, unknown>): Record<string, number> {
  const scores: Record<string, number> = {};

  // Tarefas
  const tarefas = context.tarefas as Array<unknown> | undefined;
  if (Array.isArray(tarefas)) {
    scores.tarefas = Math.min(100, tarefas.length * 10);
  } else {
    scores.tarefas = 0;
  }

  // Hábitos — média de streak
  const habitos = context.habitos as Array<{ streak?: number }> | undefined;
  if (Array.isArray(habitos) && habitos.length > 0) {
    const avgStreak = habitos.reduce((acc, h) => acc + (h.streak ?? 0), 0) / habitos.length;
    scores.habitos = Math.min(100, Math.round((avgStreak / 21) * 100));
  } else {
    scores.habitos = 0;
  }

  // Metas — média de progress
  const metas = context.metas as Array<{ progress?: number }> | undefined;
  if (Array.isArray(metas) && metas.length > 0) {
    const avgProgress = metas.reduce((acc, g) => acc + (g.progress ?? 0), 0) / metas.length;
    scores.metas = Math.min(100, Math.round(avgProgress));
  } else {
    scores.metas = 0;
  }

  // Financeiro
  const financeiro = context.financeiro as { income?: number; expenses?: number } | undefined;
  if (financeiro && typeof financeiro.income === 'number' && typeof financeiro.expenses === 'number') {
    const ratio = financeiro.expenses / Math.max(1, financeiro.income);
    scores.financeiro = Math.min(100, Math.round((1 - ratio) * 100));
  } else {
    scores.financeiro = 50;
  }

  // Fitness
  const fitness = context.fitness as { weeklyActivities?: number; goalWeeklyActivities?: number } | undefined;
  if (fitness && typeof fitness.weeklyActivities === 'number' && typeof fitness.goalWeeklyActivities === 'number') {
    const ratio = fitness.weeklyActivities / Math.max(1, fitness.goalWeeklyActivities);
    scores.fitness = Math.min(100, Math.round(ratio * 100));
  } else {
    scores.fitness = 0;
  }

  // Calendário, insights, foco, perfil — baseado em presença de dados
  const otherAreas = ['calendario', 'insights', 'foco', 'perfil'] as const;
  for (const area of otherAreas) {
    const val = context[area];
    if (val !== undefined && val !== null) {
      scores[area] = Array.isArray(val) ? Math.min(100, (val as unknown[]).length * 20) : 60;
    } else {
      scores[area] = 20;
    }
  }

  return scores;
}

export async function runPhase(
  run: CILoopRun,
  phase: CIPhase,
  context: Record<string, unknown>
): Promise<CIPhaseResult> {
  const startedAt = new Date().toISOString();

  try {
    let output: Record<string, unknown> = {};

    if (phase === 'assess') {
      const areaScores = computeAreaScores(context);
      run.areaScores = areaScores;
      output = { areaScores };

    } else if (phase === 'gap') {
      const gaps: string[] = [];
      const critical: string[] = [];

      for (const [area, score] of Object.entries(run.areaScores)) {
        if (score < 40) {
          critical.push(area);
        } else if (score < 60) {
          gaps.push(area);
        }
      }

      run.criticalGaps = critical.slice(0, 3);
      output = { gaps, criticalGaps: run.criticalGaps };

    } else if (phase === 'plan') {
      const plan: string[] = [];
      const allProblemAreas = [...run.criticalGaps];

      // Adicionar áreas com score < 60 que não sejam já críticas
      for (const [area, score] of Object.entries(run.areaScores)) {
        if (score < 60 && !allProblemAreas.includes(area)) {
          allProblemAreas.push(area);
        }
      }

      const actionMap: Record<string, string[]> = {
        habitos: [
          'Retomar rotina diária de hábitos com no mínimo 1 hábito por dia',
          'Registrar hábitos no app ao final de cada dia',
        ],
        metas: [
          'Revisar metas semanais e atualizar progresso',
          'Definir próxima ação concreta para cada meta em andamento',
        ],
        tarefas: [
          'Organizar lista de tarefas e priorizar as mais urgentes',
          'Concluir pelo menos 3 tarefas pendentes esta semana',
        ],
        financeiro: [
          'Registrar todas as despesas da semana no app',
          'Revisar orçamento mensal e identificar gastos desnecessários',
        ],
        fitness: [
          'Agendar pelo menos 3 sessões de atividade física esta semana',
          'Registrar treinos realizados no app de fitness',
        ],
        calendario: [
          'Organizar agenda da próxima semana com antecedência',
        ],
        insights: [
          'Revisar insights gerados e aplicar recomendações pendentes',
        ],
        foco: [
          'Usar sessões de foco de 25 minutos para tarefas prioritárias',
        ],
        perfil: [
          'Atualizar perfil com preferências e objetivos atuais',
        ],
      };

      for (const area of allProblemAreas) {
        const actions = actionMap[area] ?? [`Dedicar atenção à área de ${area} esta semana`];
        plan.push(...actions);
        if (plan.length >= 5) break;
      }

      if (plan.length < 3) {
        plan.push('Manter consistência nas áreas em que está indo bem');
        plan.push('Revisar metas de longo prazo e ajustar se necessário');
        plan.push('Celebrar progressos alcançados esta semana');
      }

      run.weeklyPlan = plan.slice(0, 5);
      output = { weeklyPlan: run.weeklyPlan };

    } else if (phase === 'execute') {
      output = {
        delivered: true,
        deliveredAt: new Date().toISOString(),
        planItemCount: run.weeklyPlan.length,
        note: 'Plano semanal entregue ao usuário via interface.',
      };

    } else if (phase === 'review') {
      const store = loadCIStore(run.userId);
      const previousRuns = store.runs.filter((r) => r.id !== run.id);
      const previousRun = previousRuns.length > 0 ? previousRuns[previousRuns.length - 1] : null;

      let improvement: Record<string, number> = {};
      let improvementSummary = '';

      if (previousRun && Object.keys(previousRun.areaScores).length > 0) {
        for (const [area, currentScore] of Object.entries(run.areaScores)) {
          const previousScore = previousRun.areaScores[area] ?? 0;
          improvement[area] = currentScore - previousScore;
        }
        const avgImprovement = Object.values(improvement).reduce((a, b) => a + b, 0) / Math.max(1, Object.values(improvement).length);
        improvementSummary = avgImprovement > 0
          ? `Melhoria média de ${avgImprovement.toFixed(1)} pontos em relação ao loop anterior.`
          : avgImprovement < 0
          ? `Queda média de ${Math.abs(avgImprovement).toFixed(1)} pontos em relação ao loop anterior.`
          : 'Pontuação estável em relação ao loop anterior.';
      } else {
        improvementSummary = 'Primeira avaliação — baseline estabelecido.';
      }

      const avgScore = Object.values(run.areaScores).reduce((a, b) => a + b, 0) / Math.max(1, Object.values(run.areaScores).length);
      const criticalCount = run.criticalGaps.length;

      run.summary = [
        `Loop CI #${run.iteration} concluído.`,
        `Score médio: ${avgScore.toFixed(0)}/100.`,
        criticalCount > 0
          ? `Áreas críticas: ${run.criticalGaps.join(', ')}.`
          : 'Nenhuma área crítica identificada.',
        improvementSummary,
        `Plano semanal com ${run.weeklyPlan.length} ações gerado.`,
      ].join(' ');

      output = { improvement, avgScore: Math.round(avgScore), summary: run.summary };
    }

    const endedAt = new Date().toISOString();
    return { phase, startedAt, endedAt, output, status: 'ok' };

  } catch (err) {
    const endedAt = new Date().toISOString();
    return {
      phase,
      startedAt,
      endedAt,
      output: {},
      status: 'error',
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

export async function runFullCILoop(
  userId: string,
  context: Record<string, unknown>
): Promise<CILoopRun> {
  const run = createCIRun(userId);
  const phases: CIPhase[] = ['assess', 'gap', 'plan', 'execute', 'review'];

  for (const phase of phases) {
    run.currentPhase = phase;
    const result = await runPhase(run, phase, context);
    run.phases.push(result);
  }

  run.currentPhase = 'done';
  run.completedAt = new Date().toISOString();

  saveCIRun(run, userId);

  return run;
}
