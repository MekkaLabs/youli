/**
 * Life Gap Analyzer — SWE-CI-inspired "Test Gap Analysis"
 * Compara estado atual vs. targets por área e gera requisitos de mudança.
 */

export type GapPriority = 'critical' | 'high' | 'medium' | 'low';

export interface LifeGap {
  area: string;
  metric: string;            // ex: "streak de meditação"
  currentValue: number | string;
  targetValue: number | string;
  gapMagnitude: number;      // 0-1, onde 1 = gap máximo
  priority: GapPriority;
  requirement: string;       // frase de requisito gerada ex: "Retomar meditação diária para atingir 21 dias de streak"
  estimatedDays: number;     // dias estimados para fechar o gap
}

export interface GapAnalysisResult {
  userId: string;
  analyzedAt: string;
  gaps: LifeGap[];
  criticalGaps: LifeGap[];   // gaps com priority === 'critical'
  topRequirements: string[]; // top 3 requirements em linguagem natural
  overallGapScore: number;   // 0-100, onde 0 = sem gaps, 100 = todos críticos
}

export function scorePriority(magnitude: number): GapPriority {
  if (magnitude >= 0.8) return 'critical';
  if (magnitude >= 0.6) return 'high';
  if (magnitude >= 0.4) return 'medium';
  return 'low';
}

export function analyzeAreaGaps(area: string, data: unknown): LifeGap[] {
  const gaps: LifeGap[] = [];

  if (area === 'habitos') {
    const habits = data as Array<{ title?: string; streak?: number }> | undefined;
    if (!Array.isArray(habits) || habits.length === 0) {
      gaps.push({
        area,
        metric: 'hábitos ativos',
        currentValue: 0,
        targetValue: 3,
        gapMagnitude: 1,
        priority: 'critical',
        requirement: 'Criar ao menos 3 hábitos e começar a registrá-los diariamente',
        estimatedDays: 7,
      });
      return gaps;
    }

    for (const habit of habits) {
      const streak = habit.streak ?? 0;
      const title = habit.title ?? 'Hábito';
      if (streak < 3) {
        const magnitude = 1 - streak / 21;
        gaps.push({
          area,
          metric: `streak de ${title}`,
          currentValue: streak,
          targetValue: 21,
          gapMagnitude: Math.min(1, magnitude),
          priority: scorePriority(magnitude),
          requirement: `Retomar "${title}" diariamente para atingir 21 dias de streak (atual: ${streak} dias)`,
          estimatedDays: Math.ceil((21 - streak) * 1.2),
        });
      } else if (streak < 7) {
        const magnitude = (7 - streak) / 21;
        gaps.push({
          area,
          metric: `streak de ${title}`,
          currentValue: streak,
          targetValue: 21,
          gapMagnitude: Math.min(1, magnitude),
          priority: scorePriority(magnitude),
          requirement: `Manter consistência em "${title}" até atingir 7 dias consecutivos (atual: ${streak})`,
          estimatedDays: 7 - streak,
        });
      }
    }

  } else if (area === 'metas') {
    const goals = data as Array<{ title?: string; progress?: number }> | undefined;
    if (!Array.isArray(goals) || goals.length === 0) {
      gaps.push({
        area,
        metric: 'metas definidas',
        currentValue: 0,
        targetValue: 1,
        gapMagnitude: 1,
        priority: 'critical',
        requirement: 'Definir ao menos uma meta com prazo e critério de sucesso claro',
        estimatedDays: 3,
      });
      return gaps;
    }

    for (const goal of goals) {
      const progress = goal.progress ?? 0;
      const title = goal.title ?? 'Meta';
      if (progress < 20) {
        const magnitude = 1 - progress / 100;
        gaps.push({
          area,
          metric: `progresso de ${title}`,
          currentValue: `${progress}%`,
          targetValue: '100%',
          gapMagnitude: Math.min(1, magnitude),
          priority: scorePriority(magnitude),
          requirement: `Avançar significativamente em "${title}" — progresso atual crítico: ${progress}%`,
          estimatedDays: Math.ceil((100 - progress) * 0.5),
        });
      } else if (progress < 50) {
        const magnitude = (50 - progress) / 100;
        gaps.push({
          area,
          metric: `progresso de ${title}`,
          currentValue: `${progress}%`,
          targetValue: '100%',
          gapMagnitude: Math.min(1, magnitude),
          priority: scorePriority(magnitude),
          requirement: `Acelerar progresso em "${title}" para superar 50% (atual: ${progress}%)`,
          estimatedDays: Math.ceil((100 - progress) * 0.3),
        });
      }
    }

  } else if (area === 'tarefas') {
    const tasks = data as Array<{ title?: string; status?: string; nextStep?: string }> | undefined;
    if (!Array.isArray(tasks)) return gaps;

    const overdue = tasks.filter(
      (t) => t.status === 'todo' && !t.nextStep
    );

    if (overdue.length > 0) {
      const magnitude = Math.min(1, overdue.length / Math.max(1, tasks.length));
      gaps.push({
        area,
        metric: 'tarefas sem próximo passo definido',
        currentValue: overdue.length,
        targetValue: 0,
        gapMagnitude: magnitude,
        priority: scorePriority(magnitude),
        requirement: `Definir próximo passo para ${overdue.length} tarefa(s) pendente(s) sem ação clara`,
        estimatedDays: Math.ceil(overdue.length * 0.5),
      });
    }

  } else if (area === 'financeiro') {
    const fin = data as { income?: number; expenses?: number } | undefined;
    if (!fin || typeof fin.income !== 'number' || typeof fin.expenses !== 'number') {
      gaps.push({
        area,
        metric: 'dados financeiros',
        currentValue: 'ausente',
        targetValue: 'registrado',
        gapMagnitude: 0.7,
        priority: 'high',
        requirement: 'Conectar conta bancária ou registrar receitas e despesas manualmente',
        estimatedDays: 2,
      });
      return gaps;
    }

    const ratio = fin.expenses / Math.max(1, fin.income);
    if (ratio > 0.8) {
      const magnitude = Math.min(1, (ratio - 0.8) / 0.2 + 0.5);
      gaps.push({
        area,
        metric: 'taxa despesas/receita',
        currentValue: `${(ratio * 100).toFixed(0)}%`,
        targetValue: '80%',
        gapMagnitude: magnitude,
        priority: scorePriority(magnitude),
        requirement: `Reduzir despesas ou aumentar receita — despesas em ${(ratio * 100).toFixed(0)}% da receita (meta: < 80%)`,
        estimatedDays: 30,
      });
    }

  } else if (area === 'fitness') {
    const fit = data as { weeklyActivities?: number; goalWeeklyActivities?: number } | undefined;
    if (!fit || typeof fit.weeklyActivities !== 'number') {
      gaps.push({
        area,
        metric: 'atividades semanais',
        currentValue: 0,
        targetValue: 3,
        gapMagnitude: 1,
        priority: 'critical',
        requirement: 'Registrar pelo menos 1 atividade física esta semana para estabelecer baseline',
        estimatedDays: 7,
      });
      return gaps;
    }

    const goal = fit.goalWeeklyActivities ?? 3;
    const current = fit.weeklyActivities;
    if (current < goal) {
      const magnitude = Math.min(1, (goal - current) / goal);
      gaps.push({
        area,
        metric: 'atividades físicas por semana',
        currentValue: current,
        targetValue: goal,
        gapMagnitude: magnitude,
        priority: scorePriority(magnitude),
        requirement: `Aumentar frequência de exercícios: ${current} de ${goal} atividades semanais realizadas`,
        estimatedDays: 14,
      });
    }

  } else {
    // Áreas genéricas: gap se dados ausentes ou vazios
    if (
      data === undefined ||
      data === null ||
      (Array.isArray(data) && (data as unknown[]).length === 0) ||
      (typeof data === 'object' && Object.keys(data as object).length === 0)
    ) {
      gaps.push({
        area,
        metric: `dados de ${area}`,
        currentValue: 'ausente',
        targetValue: 'preenchido',
        gapMagnitude: 0.5,
        priority: 'medium',
        requirement: `Preencher informações da área de ${area} para análise completa`,
        estimatedDays: 1,
      });
    }
  }

  return gaps;
}

export function rankGapsByPriority(gaps: LifeGap[]): LifeGap[] {
  const priorityOrder: Record<GapPriority, number> = {
    critical: 0,
    high: 1,
    medium: 2,
    low: 3,
  };

  return [...gaps].sort((a, b) => {
    const pDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
    if (pDiff !== 0) return pDiff;
    return b.gapMagnitude - a.gapMagnitude;
  });
}

export function generateRequirementsFromGaps(gaps: LifeGap[]): string[] {
  return rankGapsByPriority(gaps)
    .slice(0, 3)
    .map((g) => g.requirement);
}

export function analyzeGaps(
  userId: string,
  context: Record<string, unknown>
): GapAnalysisResult {
  const areas = [
    'dashboard', 'tarefas', 'habitos', 'metas', 'financeiro',
    'fitness', 'calendario', 'insights', 'foco', 'perfil',
  ] as const;

  const allGaps: LifeGap[] = [];

  for (const area of areas) {
    const areaData = context[area];
    const areaGaps = analyzeAreaGaps(area, areaData);
    allGaps.push(...areaGaps);
  }

  const ranked = rankGapsByPriority(allGaps);
  const criticalGaps = ranked.filter((g) => g.priority === 'critical');
  const topRequirements = generateRequirementsFromGaps(ranked);

  // Overall gap score: 0 = sem gaps, 100 = todos críticos
  const overallGapScore =
    ranked.length === 0
      ? 0
      : Math.round(
          (ranked.reduce((acc, g) => acc + g.gapMagnitude, 0) / ranked.length) * 100
        );

  return {
    userId,
    analyzedAt: new Date().toISOString(),
    gaps: ranked,
    criticalGaps,
    topRequirements,
    overallGapScore,
  };
}
