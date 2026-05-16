/**
 * Maintainability Scorer — SWE-CI-inspired "Maintainability Focus"
 * Avalia se os planos de vida são sustentáveis a longo prazo.
 * Inspirado na avaliação de "código sustentável" do SWE-CI vs "código correto agora".
 */

export interface MaintainabilityBreakdown {
  cognitiveLoad: number;       // 0-100 (alto = muito carga mental)
  scheduleConflicts: number;   // 0-100 (alto = muitos conflitos de agenda)
  goalRealism: number;         // 0-100 (alto = metas realistas)
  habitFriction: number;       // 0-100 (alto = baixo atrito = fácil de manter)
}

export interface MaintainabilityResult {
  score: number;               // 0-100 (100 = totalmente sustentável)
  breakdown: MaintainabilityBreakdown;
  verdict: 'sustainable' | 'moderate_risk' | 'high_risk';
  warnings: string[];          // lista de avisos em português
  recommendations: string[];   // ações para melhorar sustentabilidade
}

export function scoreCognitiveLoad(context: Record<string, unknown>): number {
  const tarefas = context['tarefas'] as Array<{ status?: string }> | undefined;
  const habitos = context['habitos'] as Array<{ streak?: number }> | undefined;
  const metas = context['metas'] as Array<unknown> | undefined;

  const doingCount = Array.isArray(tarefas)
    ? tarefas.filter((t) => t.status === 'doing').length
    : 0;

  const newHabitsCount = Array.isArray(habitos)
    ? habitos.filter((h) => (h.streak ?? 0) < 7).length
    : 0;

  const activeGoalsCount = Array.isArray(metas) ? metas.length : 0;

  const totalItems = doingCount + newHabitsCount + activeGoalsCount;
  const threshold = 5;

  if (totalItems <= threshold) {
    return 100;
  }

  const extra = totalItems - threshold;
  const penalty = extra * 20;
  return Math.max(0, 100 - penalty);
}

export function scoreScheduleConflicts(context: Record<string, unknown>): number {
  const calendario = context['calendario'] as
    | Array<{ date?: string; events?: unknown[] }>
    | undefined;

  if (!Array.isArray(calendario) || calendario.length === 0) {
    return 100;
  }

  // Contar eventos por dia
  const eventsPerDay: Record<string, number> = {};
  for (const entry of calendario) {
    const date = entry.date ?? 'unknown';
    const eventCount = Array.isArray(entry.events) ? entry.events.length : 1;
    eventsPerDay[date] = (eventsPerDay[date] ?? 0) + eventCount;
  }

  const dayValues = Object.values(eventsPerDay);
  const overloadedDays = dayValues.filter((count) => count > 3).length;

  if (overloadedDays === 0) return 100;

  const penalty = overloadedDays * 15;
  return Math.max(0, 100 - penalty);
}

export function scoreGoalRealism(context: Record<string, unknown>): number {
  const metas = context['metas'] as
    | Array<{ progress?: number; createdAt?: string; target?: number }>
    | undefined;

  if (!Array.isArray(metas) || metas.length === 0) {
    return 80; // sem metas = neutro positivo
  }

  let totalScore = 0;
  for (const meta of metas) {
    const progress = meta.progress ?? 0;
    const createdAt = meta.createdAt ? new Date(meta.createdAt) : null;
    const daysElapsed = createdAt
      ? Math.floor((Date.now() - createdAt.getTime()) / 86_400_000)
      : 0;

    // Meta com < 10% progresso em > 30 dias = baixo realismo
    if (daysElapsed > 30 && progress < 10) {
      totalScore += 20;
    } else if (daysElapsed > 60 && progress < 30) {
      totalScore += 40;
    } else {
      totalScore += 100;
    }
  }

  return Math.round(totalScore / metas.length);
}

export function scoreHabitFriction(context: Record<string, unknown>): number {
  const habitos = context['habitos'] as Array<{ streak?: number }> | undefined;

  if (!Array.isArray(habitos) || habitos.length === 0) {
    return 50; // sem hábitos = neutro
  }

  let totalScore = 0;
  for (const habito of habitos) {
    const streak = habito.streak ?? 0;
    if (streak > 21) {
      totalScore += 100; // baixo atrito — hábito consolidado
    } else if (streak >= 7) {
      totalScore += 70; // atrito moderado
    } else {
      totalScore += 30; // alto atrito — hábito novo
    }
  }

  return Math.round(totalScore / habitos.length);
}

export function scoreMaintainability(context: Record<string, unknown>): MaintainabilityResult {
  const cognitiveLoad = scoreCognitiveLoad(context);
  const scheduleConflicts = scoreScheduleConflicts(context);
  const goalRealism = scoreGoalRealism(context);
  const habitFriction = scoreHabitFriction(context);

  const score = Math.round(
    cognitiveLoad * 0.3 +
    scheduleConflicts * 0.2 +
    goalRealism * 0.3 +
    habitFriction * 0.2
  );

  let verdict: MaintainabilityResult['verdict'];
  if (score >= 70) {
    verdict = 'sustainable';
  } else if (score >= 40) {
    verdict = 'moderate_risk';
  } else {
    verdict = 'high_risk';
  }

  const warnings: string[] = [];
  const recommendations: string[] = [];

  if (cognitiveLoad < 60) {
    warnings.push('Carga cognitiva alta: muitas tarefas e hábitos simultâneos.');
    recommendations.push('Reduza tarefas em andamento — foque em no máximo 3 por vez.');
    recommendations.push('Pause hábitos novos até consolidar os atuais.');
  }

  if (scheduleConflicts < 60) {
    warnings.push('Agenda sobrecarregada: muitos eventos em alguns dias.');
    recommendations.push('Distribua compromissos ao longo da semana para reduzir picos.');
  }

  if (goalRealism < 60) {
    warnings.push('Algumas metas apresentam baixo progresso após período prolongado.');
    recommendations.push('Revise metas com < 10% de progresso há mais de 30 dias.');
    recommendations.push('Quebre metas grandes em marcos menores e mais atingíveis.');
  }

  if (habitFriction < 60) {
    warnings.push('Muitos hábitos novos com alto atrito — risco de abandono.');
    recommendations.push('Foque em 1-2 hábitos novos por vez até atingir 21 dias de streak.');
  }

  if (warnings.length === 0) {
    recommendations.push('Continue o ritmo atual — seu plano de vida está sustentável.');
  }

  const breakdown: MaintainabilityBreakdown = {
    cognitiveLoad,
    scheduleConflicts,
    goalRealism,
    habitFriction,
  };

  return { score, breakdown, verdict, warnings, recommendations };
}
