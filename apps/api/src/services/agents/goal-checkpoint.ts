/**
 * Goal Checkpoint Resume — SWE-CI-inspired Breakpoint Resume (断点续跑)
 * Salva checkpoints de progresso de metas e permite retomada inteligente
 * após períodos de inatividade.
 */
import fs from 'node:fs';
import path from 'node:path';

export type GoalPhase =
  | 'initiated'
  | 'in_progress'
  | 'blocked'
  | 'resumed'
  | 'completed'
  | 'abandoned';

export interface GoalCheckpoint {
  id: string;            // ckpt_${goalId}_${Date.now()}
  goalId: string;
  goalTitle: string;
  userId: string;
  phase: GoalPhase;
  progressAtCheckpoint: number;  // 0-100%
  lastActiveAt: string;
  contextSnapshot: Record<string, unknown>;  // snapshot reduzido do contexto relevante
  blockingFactors: string[];
  resumptionPlan: string[];
  notes: string;
}

export interface CheckpointStore {
  userId: string;
  checkpoints: GoalCheckpoint[];
  updatedAt: string;
}

const DATA_DIR = path.join(process.cwd(), '.data');

function ensureDataDir(): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function getStorePath(userId: string): string {
  return path.join(DATA_DIR, `checkpoints-${userId}.json`);
}

function loadStore(userId: string): CheckpointStore {
  const filePath = getStorePath(userId);
  if (!fs.existsSync(filePath)) {
    return { userId, checkpoints: [], updatedAt: new Date().toISOString() };
  }
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf-8')) as CheckpointStore;
  } catch {
    return { userId, checkpoints: [], updatedAt: new Date().toISOString() };
  }
}

function buildContextSnapshot(
  goal: { id: string; title: string; progress: number },
  context: Record<string, unknown>
): Record<string, unknown> {
  // Extrai apenas campos relevantes ao goal do contexto completo
  const snapshot: Record<string, unknown> = {
    goalId: goal.id,
    goalTitle: goal.title,
    progressAtCapture: goal.progress,
    capturedAt: new Date().toISOString(),
  };

  // Inclui dados de metas e tarefas relacionadas
  if (context['metas']) snapshot['metas'] = context['metas'];
  if (context['tarefas']) {
    const tarefas = context['tarefas'] as Array<{ goalId?: string }> | undefined;
    if (Array.isArray(tarefas)) {
      snapshot['tarefasRelacionadas'] = tarefas.filter((t) => t.goalId === goal.id);
    }
  }

  return snapshot;
}

function detectBlockingFactors(context: Record<string, unknown>): string[] {
  const factors: string[] = [];

  const tarefas = context['tarefas'] as Array<{ status?: string }> | undefined;
  const doingCount = Array.isArray(tarefas)
    ? tarefas.filter((t) => t.status === 'doing').length
    : 0;

  if (doingCount > 5) {
    factors.push('Excesso de tarefas simultâneas em andamento');
  }

  const financeiro = context['financeiro'] as { balance?: number } | undefined;
  if (financeiro && typeof financeiro.balance === 'number' && financeiro.balance < 0) {
    factors.push('Situação financeira negativa pode limitar recursos');
  }

  const fitness = context['fitness'] as { energy?: number } | undefined;
  if (fitness && typeof fitness.energy === 'number' && fitness.energy < 30) {
    factors.push('Baixa energia reportada — impacta produtividade');
  }

  if (factors.length === 0) {
    factors.push('Nenhum fator bloqueante identificado automaticamente');
  }

  return factors;
}

export function createCheckpoint(
  userId: string,
  goal: { id: string; title: string; progress: number },
  context: Record<string, unknown>,
  phase: GoalPhase = 'in_progress'
): GoalCheckpoint {
  const contextSnapshot = buildContextSnapshot(goal, context);
  const blockingFactors = detectBlockingFactors(context);

  return {
    id: `ckpt_${goal.id}_${Date.now()}`,
    goalId: goal.id,
    goalTitle: goal.title,
    userId,
    phase,
    progressAtCheckpoint: goal.progress,
    lastActiveAt: new Date().toISOString(),
    contextSnapshot,
    blockingFactors,
    resumptionPlan: [],
    notes: '',
  };
}

export function saveCheckpoint(checkpoint: GoalCheckpoint): void {
  ensureDataDir();
  const store = loadStore(checkpoint.userId);
  store.checkpoints.push(checkpoint);
  store.updatedAt = new Date().toISOString();
  fs.writeFileSync(getStorePath(checkpoint.userId), JSON.stringify(store, null, 2), 'utf-8');
}

export function loadCheckpoints(userId: string): GoalCheckpoint[] {
  return loadStore(userId).checkpoints;
}

export function detectInactiveGoals(userId: string, inactivityDays: number): GoalCheckpoint[] {
  const checkpoints = loadCheckpoints(userId);
  const cutoff = Date.now() - inactivityDays * 86_400_000;

  // Para cada goalId, pegar o checkpoint mais recente
  const latestByGoal = new Map<string, GoalCheckpoint>();
  for (const ckpt of checkpoints) {
    const existing = latestByGoal.get(ckpt.goalId);
    if (!existing || ckpt.lastActiveAt > existing.lastActiveAt) {
      latestByGoal.set(ckpt.goalId, ckpt);
    }
  }

  const inactive: GoalCheckpoint[] = [];
  for (const ckpt of latestByGoal.values()) {
    if (ckpt.phase === 'completed' || ckpt.phase === 'abandoned') continue;
    const lastActive = new Date(ckpt.lastActiveAt).getTime();
    if (lastActive < cutoff) {
      inactive.push(ckpt);
    }
  }

  return inactive;
}

export function buildResumptionPlan(
  checkpoint: GoalCheckpoint,
  currentContext: Record<string, unknown>
): string[] {
  const plan: string[] = [];

  plan.push(
    `Revisar progresso atual — você estava em ${checkpoint.progressAtCheckpoint}% quando pausou.`
  );

  // Comparar snapshots para identificar mudanças
  const snapshot = checkpoint.contextSnapshot;
  const snapshotMetas = snapshot['metas'] as Array<{ id?: string; progress?: number }> | undefined;
  const currentMetas = currentContext['metas'] as
    | Array<{ id?: string; progress?: number }>
    | undefined;

  if (Array.isArray(snapshotMetas) && Array.isArray(currentMetas)) {
    const changed = currentMetas.filter((cm) => {
      const old = snapshotMetas.find((sm) => sm.id === cm.id);
      return old && cm.progress !== old.progress;
    });
    if (changed.length > 0) {
      plan.push(`${changed.length} meta(s) sofreram alteração desde o último checkpoint — revisar.`);
    }
  }

  plan.push('Redefinir próximo milestone: o que precisa acontecer nos próximos 7 dias?');

  if (checkpoint.blockingFactors.length > 0 &&
      checkpoint.blockingFactors[0] !== 'Nenhum fator bloqueante identificado automaticamente') {
    plan.push(`Endereçar fator bloqueante: "${checkpoint.blockingFactors[0]}"`);
  }

  plan.push('Agendar sessão de trabalho focada (mínimo 30 min) para retomar o ritmo.');

  return plan.slice(0, 5);
}

export function markResumed(
  userId: string,
  goalId: string,
  currentContext: Record<string, unknown>
): GoalCheckpoint | null {
  const checkpoints = loadCheckpoints(userId);

  // Encontrar checkpoint mais recente do goal
  const goalCheckpoints = checkpoints
    .filter((c) => c.goalId === goalId)
    .sort((a, b) => (a.lastActiveAt > b.lastActiveAt ? -1 : 1));

  if (goalCheckpoints.length === 0) return null;

  const latest = goalCheckpoints[0];

  const resumptionPlan = buildResumptionPlan(latest, currentContext);

  const metas = currentContext['metas'] as Array<{ id?: string; progress?: number }> | undefined;
  const currentGoal = Array.isArray(metas) ? metas.find((m) => m.id === goalId) : undefined;
  const currentProgress = currentGoal?.progress ?? latest.progressAtCheckpoint;

  const resumed: GoalCheckpoint = createCheckpoint(
    userId,
    {
      id: goalId,
      title: latest.goalTitle,
      progress: currentProgress,
    },
    currentContext,
    'resumed'
  );

  resumed.resumptionPlan = resumptionPlan;
  saveCheckpoint(resumed);

  return resumed;
}
