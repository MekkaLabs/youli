import fs from 'node:fs';
import path from 'node:path';
import { LifeArea } from './agent-definitions';
import { UserContext } from './agent-executor';

export interface UserPattern {
  id: string;
  area: string;
  type: 'time_preference' | 'amount_threshold' | 'habit_trigger' | 'productivity_peak' | 'behavior_pattern';
  description: string;
  confidence: number;
  dataPoints: number;
  learnedAt: string;
  updatedAt: string;
}

export interface PatternStore {
  userId: string;
  patterns: UserPattern[];
  updatedAt: string;
}

const DATA_DIR = path.join(process.cwd(), 'src', 'repositories', '.data');

function patternFilePath(userId: string): string {
  return path.join(DATA_DIR, `patterns-${userId}.json`);
}

function nowIso(): string {
  return new Date().toISOString();
}

export function extractPatternsFromContext(context: UserContext, area: LifeArea): UserPattern[] {
  const patterns: UserPattern[] = [];
  const now = nowIso();

  // --- time_preference: detect check-in hour patterns from habits ---
  const habits = context.habits ?? [];
  if (habits.length > 0 && (area === 'habitos' || area === 'foco' || area === 'fitness')) {
    const morningHabits = habits.filter((h) => {
      const time = (h as any).preferredTime as string | undefined;
      if (!time) return false;
      const hour = parseInt(time.split(':')[0] ?? '12', 10);
      return hour >= 6 && hour < 10;
    });
    if (morningHabits.length > 0) {
      patterns.push({
        id: `time_pref_morning_${area}`,
        area,
        type: 'time_preference',
        description: `Usuário prefere hábitos pela manhã (6-10h) — ${morningHabits.length} hábito(s) configurado(s) nesse horário`,
        confidence: Math.min(0.5 + morningHabits.length * 0.1, 0.95),
        dataPoints: morningHabits.length,
        learnedAt: now,
        updatedAt: now,
      });
    }

    // streak-based: identify habit triggers
    const streakHabits = habits.filter((h) => h.streak >= 3);
    if (streakHabits.length > 0) {
      patterns.push({
        id: `habit_trigger_streak_${area}`,
        area,
        type: 'habit_trigger',
        description: `Usuário mantém streaks de ${Math.round(streakHabits.reduce((s, h) => s + h.streak, 0) / streakHabits.length)} dias em ${streakHabits.length} hábito(s)`,
        confidence: Math.min(0.4 + streakHabits.length * 0.08, 0.9),
        dataPoints: streakHabits.length,
        learnedAt: now,
        updatedAt: now,
      });
    }
  }

  // --- amount_threshold: detect spending patterns from finances ---
  if (area === 'financeiro') {
    const txs = context.finances?.recentTransactions ?? [];
    if (txs.length > 0) {
      const amounts = txs.map((t) => Math.abs((t as any).amount as number ?? 0)).filter((v) => v > 0);
      if (amounts.length > 0) {
        const avg = amounts.reduce((a, b) => a + b, 0) / amounts.length;
        patterns.push({
          id: `amount_threshold_avg_financeiro`,
          area,
          type: 'amount_threshold',
          description: `Transações recentes com valor médio de R$ ${avg.toFixed(2)} (${amounts.length} transações)`,
          confidence: Math.min(0.4 + amounts.length * 0.05, 0.85),
          dataPoints: amounts.length,
          learnedAt: now,
          updatedAt: now,
        });
      }
    }
  }

  // --- productivity_peak: detect active tasks time distribution ---
  if (area === 'tarefas' || area === 'foco') {
    const tasks = context.tasks ?? [];
    const doingTasks = tasks.filter((t) => t.status === 'doing');
    const highPriorityTasks = tasks.filter((t) => t.priority >= 4);
    if (doingTasks.length > 0 || highPriorityTasks.length > 0) {
      patterns.push({
        id: `productivity_peak_${area}`,
        area,
        type: 'productivity_peak',
        description: `Usuário tem ${doingTasks.length} tarefa(s) em andamento e ${highPriorityTasks.length} tarefa(s) de alta prioridade`,
        confidence: Math.min(0.45 + (doingTasks.length + highPriorityTasks.length) * 0.07, 0.9),
        dataPoints: doingTasks.length + highPriorityTasks.length,
        learnedAt: now,
        updatedAt: now,
      });
    }
  }

  // --- behavior_pattern: goal progress consistency ---
  if (area === 'metas') {
    const goals = context.goals ?? [];
    const activeGoals = goals.filter((g) => g.status !== 'done');
    if (activeGoals.length > 0) {
      const avgProgress = activeGoals.reduce((s, g) => s + g.progress, 0) / activeGoals.length;
      patterns.push({
        id: `behavior_pattern_goal_progress_metas`,
        area,
        type: 'behavior_pattern',
        description: `Progresso médio de ${avgProgress.toFixed(0)}% em ${activeGoals.length} meta(s) ativa(s)`,
        confidence: Math.min(0.4 + activeGoals.length * 0.08, 0.88),
        dataPoints: activeGoals.length,
        learnedAt: now,
        updatedAt: now,
      });
    }
  }

  return patterns;
}

export function loadPatterns(userId: string): PatternStore {
  const filePath = patternFilePath(userId);
  if (!fs.existsSync(filePath)) {
    return { userId, patterns: [], updatedAt: nowIso() };
  }
  try {
    const raw = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(raw) as PatternStore;
  } catch {
    return { userId, patterns: [], updatedAt: nowIso() };
  }
}

export function savePatterns(userId: string, store: PatternStore): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  fs.writeFileSync(patternFilePath(userId), JSON.stringify(store, null, 2));
}

export function mergePatterns(existing: UserPattern[], newOnes: UserPattern[]): UserPattern[] {
  const merged = [...existing];

  for (const newPattern of newOnes) {
    const idx = merged.findIndex((p) => p.id === newPattern.id);
    if (idx >= 0) {
      const old = merged[idx]!;
      const totalPoints = old.dataPoints + newPattern.dataPoints;
      const updatedConfidence = Math.min(
        (old.confidence * old.dataPoints + newPattern.confidence * newPattern.dataPoints) / totalPoints,
        0.99
      );
      merged[idx] = {
        ...old,
        confidence: Number(updatedConfidence.toFixed(3)),
        dataPoints: totalPoints,
        description: newPattern.description,
        updatedAt: nowIso(),
      };
    } else {
      merged.push(newPattern);
    }
  }

  return merged;
}

export function getContextualPatterns(userId: string, area: LifeArea): string[] {
  const store = loadPatterns(userId);
  const relevant = store.patterns
    .filter((p) => p.area === area)
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, 3);
  return relevant.map((p) => p.description);
}

export async function updatePatternsAfterInteraction(
  userId: string,
  area: LifeArea,
  context: UserContext
): Promise<void> {
  try {
    const newOnes = extractPatternsFromContext(context, area);
    if (newOnes.length === 0) return;
    const store = loadPatterns(userId);
    const merged = mergePatterns(store.patterns, newOnes);
    savePatterns(userId, { userId, patterns: merged, updatedAt: nowIso() });
  } catch {
    // fire-and-forget: swallow errors silently
  }
}
