/**
 * Parallel Life Evaluator — SWE-CI-inspired Parallel Evaluation with Resource Limits
 * Avalia todas as 10 áreas de vida simultaneamente com budget de tokens por área.
 */

const LIFE_AREAS = [
  'dashboard',
  'tarefas',
  'habitos',
  'metas',
  'financeiro',
  'fitness',
  'calendario',
  'insights',
  'foco',
  'perfil',
] as const;

type LifeArea = (typeof LIFE_AREAS)[number];

export interface AreaEvalResult {
  area: string;
  score: number;           // 0-100
  insights: string[];      // até 3 insights
  topAction: string;       // ação mais urgente
  tokenUsed: number;       // tokens estimados usados
  status: 'ok' | 'error' | 'skipped';
  error?: string;
}

export interface ParallelEvalResult {
  userId: string;
  evaluatedAt: string;
  areaResults: Record<string, AreaEvalResult>;
  lifeHealthScore: number;   // 0-100, média ponderada
  criticalAreas: string[];   // áreas com score < 40
  topPriorities: string[];   // top 3 ações cross-área
  totalTokensUsed: number;
}

function estimateTokens(data: unknown): number {
  try {
    return Math.ceil(JSON.stringify(data).length / 4);
  } catch {
    return 10;
  }
}

function evaluateDashboard(data: unknown): Pick<AreaEvalResult, 'score' | 'insights' | 'topAction'> {
  const d = data as Record<string, unknown> | undefined;
  if (!d || Object.keys(d).length === 0) {
    return {
      score: 50,
      insights: ['Dashboard sem dados suficientes para análise completa.'],
      topAction: 'Preencher dados nas áreas de vida para melhorar o painel.',
    };
  }
  return {
    score: 75,
    insights: [
      'Dashboard com dados disponíveis.',
      'Integração entre áreas pode revelar padrões ocultos.',
    ],
    topAction: 'Revisar o painel diariamente para manter consciência do progresso.',
  };
}

function evaluateTarefas(data: unknown): Pick<AreaEvalResult, 'score' | 'insights' | 'topAction'> {
  const tarefas = data as Array<{ status?: string; priority?: string }> | undefined;
  if (!Array.isArray(tarefas) || tarefas.length === 0) {
    return {
      score: 40,
      insights: ['Nenhuma tarefa cadastrada.'],
      topAction: 'Criar pelo menos 3 tarefas prioritárias para esta semana.',
    };
  }
  const doing = tarefas.filter((t) => t.status === 'doing').length;
  const done = tarefas.filter((t) => t.status === 'done').length;
  const completionRate = tarefas.length > 0 ? (done / tarefas.length) * 100 : 0;

  let score = Math.min(100, completionRate + 30);
  if (doing > 5) score -= 20;

  const insights: string[] = [];
  insights.push(`Taxa de conclusão: ${Math.round(completionRate)}% (${done}/${tarefas.length}).`);
  if (doing > 5) insights.push(`Muitas tarefas em andamento simultâneo (${doing}) — risco de dispersão.`);
  if (completionRate > 70) insights.push('Excelente ritmo de conclusão de tarefas.');

  return {
    score: Math.max(0, Math.min(100, score)),
    insights: insights.slice(0, 3),
    topAction:
      doing > 5
        ? 'Fechar ou pausar tarefas em andamento para reduzir dispersão.'
        : 'Manter ritmo — focar nas tarefas de maior prioridade.',
  };
}

function evaluateHabitos(data: unknown): Pick<AreaEvalResult, 'score' | 'insights' | 'topAction'> {
  const habitos = data as Array<{ streak?: number; title?: string }> | undefined;
  if (!Array.isArray(habitos) || habitos.length === 0) {
    return {
      score: 20,
      insights: ['Nenhum hábito cadastrado.'],
      topAction: 'Criar 1 hábito simples e manter por 7 dias para começar.',
    };
  }
  const avgStreak = habitos.reduce((s, h) => s + (h.streak ?? 0), 0) / habitos.length;
  const consolidated = habitos.filter((h) => (h.streak ?? 0) > 21).length;
  const score = Math.min(100, 30 + avgStreak * 2 + consolidated * 10);
  return {
    score: Math.round(score),
    insights: [
      `Média de streak: ${Math.round(avgStreak)} dias.`,
      `${consolidated} hábito(s) consolidado(s) (streak > 21 dias).`,
      habitos.length < 3 ? 'Poucos hábitos — considere adicionar mais.' : 'Portfólio de hábitos diversificado.',
    ].slice(0, 3),
    topAction:
      consolidated === 0
        ? 'Focar em manter um único hábito por 21 dias para consolidar.'
        : 'Adicionar um novo hábito após solidificar os atuais.',
  };
}

function evaluateMetas(data: unknown): Pick<AreaEvalResult, 'score' | 'insights' | 'topAction'> {
  const metas = data as Array<{ progress?: number; title?: string }> | undefined;
  if (!Array.isArray(metas) || metas.length === 0) {
    return {
      score: 20,
      insights: ['Nenhuma meta definida.'],
      topAction: 'Definir pelo menos 1 meta clara com prazo e critério de sucesso.',
    };
  }
  const avgProgress = metas.reduce((s, m) => s + (m.progress ?? 0), 0) / metas.length;
  const onTrack = metas.filter((m) => (m.progress ?? 0) >= 50).length;
  const score = Math.min(100, 20 + avgProgress + onTrack * 10);
  return {
    score: Math.round(score),
    insights: [
      `Progresso médio nas metas: ${Math.round(avgProgress)}%.`,
      `${onTrack} meta(s) com mais de 50% de progresso.`,
      metas.length > 5 ? 'Muitas metas simultâneas — priorize as 3 mais importantes.' : '',
    ].filter(Boolean).slice(0, 3),
    topAction:
      avgProgress < 30
        ? 'Revisar metas com baixo progresso e quebrar em ações menores.'
        : 'Manter foco nas metas em andamento — você está no caminho.',
  };
}

function evaluateFinanceiro(data: unknown): Pick<AreaEvalResult, 'score' | 'insights' | 'topAction'> {
  const fin = data as { balance?: number; savings?: number; expenses?: number } | undefined;
  if (!fin) {
    return {
      score: 50,
      insights: ['Dados financeiros não disponíveis.'],
      topAction: 'Conectar conta bancária para análise financeira automática.',
    };
  }
  const balance = fin.balance ?? 0;
  const savings = fin.savings ?? 0;
  let score = 60;
  if (balance > 0) score += 20;
  if (savings > 0) score += 20;
  if (balance < 0) score -= 30;
  return {
    score: Math.max(0, Math.min(100, score)),
    insights: [
      balance >= 0 ? `Saldo positivo: R$ ${balance.toFixed(2)}` : `Saldo negativo: R$ ${balance.toFixed(2)}`,
      savings > 0 ? `Reserva de emergência em andamento: R$ ${savings.toFixed(2)}` : 'Sem reserva de emergência identificada.',
    ].slice(0, 3),
    topAction:
      balance < 0
        ? 'Emergência: cortar gastos não essenciais imediatamente.'
        : savings === 0
        ? 'Iniciar reserva de emergência — meta: 3 meses de despesas.'
        : 'Manter controle de gastos e aumentar reserva gradualmente.',
  };
}

function evaluateFitness(data: unknown): Pick<AreaEvalResult, 'score' | 'insights' | 'topAction'> {
  const fit = data as { workoutsPerWeek?: number; steps?: number; energy?: number } | undefined;
  if (!fit) {
    return {
      score: 40,
      insights: ['Dados de fitness não disponíveis.'],
      topAction: 'Registrar dados de treino e saúde para análise.',
    };
  }
  const workouts = fit.workoutsPerWeek ?? 0;
  const energy = fit.energy ?? 50;
  const score = Math.min(100, workouts * 15 + energy * 0.3 + 10);
  return {
    score: Math.round(score),
    insights: [
      `${workouts} treino(s) por semana.`,
      `Nível de energia: ${energy}/100.`,
      workouts >= 3 ? 'Frequência de treino adequada.' : 'Frequência de treino abaixo do recomendado.',
    ].slice(0, 3),
    topAction:
      workouts < 3
        ? 'Aumentar frequência de treino para pelo menos 3x por semana.'
        : 'Manter consistência e variar o treino para evitar platô.',
  };
}

function evaluateCalendario(data: unknown): Pick<AreaEvalResult, 'score' | 'insights' | 'topAction'> {
  const events = data as Array<unknown> | undefined;
  const count = Array.isArray(events) ? events.length : 0;
  const score = count === 0 ? 50 : Math.min(100, 60 + Math.min(count, 10) * 2);
  return {
    score,
    insights: [
      count === 0 ? 'Calendário vazio — sem compromissos registrados.' : `${count} evento(s) agendado(s).`,
      count > 15 ? 'Agenda muito cheia — risco de sobrecarga.' : 'Agenda com espaço para compromissos imprevistos.',
    ].slice(0, 3),
    topAction:
      count === 0
        ? 'Começar a agendar blocos de tempo para atividades prioritárias.'
        : count > 15
        ? 'Revisar compromissos e cancelar os de menor prioridade.'
        : 'Bloquear horário fixo para deep work na agenda.',
  };
}

function evaluateInsights(data: unknown): Pick<AreaEvalResult, 'score' | 'insights' | 'topAction'> {
  const ins = data as Array<unknown> | undefined;
  const count = Array.isArray(ins) ? ins.length : 0;
  return {
    score: count > 0 ? 75 : 40,
    insights: [
      count > 0 ? `${count} insight(s) gerado(s) recentemente.` : 'Nenhum insight gerado ainda.',
      'Insights cross-área podem revelar correlações importantes.',
    ].slice(0, 3),
    topAction:
      count === 0
        ? 'Usar o copilot para gerar insights sobre seus padrões de vida.'
        : 'Revisar insights e aplicar pelo menos 1 recomendação esta semana.',
  };
}

function evaluateFoco(data: unknown): Pick<AreaEvalResult, 'score' | 'insights' | 'topAction'> {
  const foco = data as { sessionsToday?: number; avgMinutes?: number } | undefined;
  const sessions = foco?.sessionsToday ?? 0;
  const avgMin = foco?.avgMinutes ?? 0;
  const score = Math.min(100, sessions * 15 + avgMin * 0.5 + 20);
  return {
    score: Math.round(score),
    insights: [
      `${sessions} sessão(ões) de foco hoje.`,
      avgMin > 0 ? `Média de ${Math.round(avgMin)} min por sessão.` : 'Sem dados de duração de sessão.',
    ].slice(0, 3),
    topAction:
      sessions === 0
        ? 'Iniciar uma sessão de foco de pelo menos 25 min ainda hoje.'
        : 'Manter consistência nas sessões de foco — tente aumentar 5 min/dia.',
  };
}

function evaluatePerfil(data: unknown): Pick<AreaEvalResult, 'score' | 'insights' | 'topAction'> {
  const perfil = data as { name?: string; onboardingComplete?: boolean } | undefined;
  const complete = perfil?.onboardingComplete ?? false;
  return {
    score: complete ? 80 : 40,
    insights: [
      complete ? 'Perfil completo e onboarding concluído.' : 'Perfil incompleto — dados ausentes.',
    ],
    topAction: complete
      ? 'Revise suas preferências e objetivos de vida periodicamente.'
      : 'Completar o onboarding para personalizar as recomendações.',
  };
}

const AREA_EVALUATORS: Record<
  LifeArea,
  (data: unknown) => Pick<AreaEvalResult, 'score' | 'insights' | 'topAction'>
> = {
  dashboard: evaluateDashboard,
  tarefas: evaluateTarefas,
  habitos: evaluateHabitos,
  metas: evaluateMetas,
  financeiro: evaluateFinanceiro,
  fitness: evaluateFitness,
  calendario: evaluateCalendario,
  insights: evaluateInsights,
  foco: evaluateFoco,
  perfil: evaluatePerfil,
};

export function evaluateArea(area: string, data: unknown, tokenBudget: number): AreaEvalResult {
  try {
    const evaluator = AREA_EVALUATORS[area as LifeArea];
    if (!evaluator) {
      return {
        area,
        score: 50,
        insights: ['Área não reconhecida.'],
        topAction: 'Verificar configuração da área.',
        tokenUsed: 0,
        status: 'skipped',
      };
    }

    const tokenUsed = estimateTokens(data);
    if (tokenUsed > tokenBudget) {
      return {
        area,
        score: 50,
        insights: ['Budget de tokens excedido para esta área.'],
        topAction: 'Reduzir dados enviados para análise.',
        tokenUsed,
        status: 'skipped',
      };
    }

    const result = evaluator(data);
    return {
      area,
      ...result,
      tokenUsed,
      status: 'ok',
    };
  } catch (err) {
    return {
      area,
      score: 0,
      insights: [],
      topAction: 'Verificar dados desta área.',
      tokenUsed: 0,
      status: 'error',
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

const AREA_WEIGHTS: Record<string, number> = {
  financeiro: 1.5,
  metas: 1.5,
  fitness: 1.2,
  habitos: 1.2,
  dashboard: 1.0,
  tarefas: 1.0,
  calendario: 1.0,
  insights: 1.0,
  foco: 1.0,
  perfil: 1.0,
};

export async function evaluateAllAreas(
  userId: string,
  context: Record<string, unknown>,
  tokenBudgetPerArea = 2000
): Promise<ParallelEvalResult> {
  const evaluatedAt = new Date().toISOString();

  const promises = LIFE_AREAS.map((area) =>
    Promise.resolve(evaluateArea(area, context[area], tokenBudgetPerArea))
  );

  const settled = await Promise.allSettled(promises);

  const areaResults: Record<string, AreaEvalResult> = {};
  let weightedSum = 0;
  let weightTotal = 0;
  let totalTokensUsed = 0;

  settled.forEach((result, index) => {
    const area = LIFE_AREAS[index];
    if (result.status === 'fulfilled') {
      areaResults[area] = result.value;
    } else {
      areaResults[area] = {
        area,
        score: 0,
        insights: ['Erro ao avaliar área.'],
        topAction: 'Verificar dados desta área.',
        tokenUsed: 0,
        status: 'error',
        error: String(result.reason),
      };
    }
    const evalResult = areaResults[area];
    const weight = AREA_WEIGHTS[area] ?? 1.0;
    weightedSum += evalResult.score * weight;
    weightTotal += weight;
    totalTokensUsed += evalResult.tokenUsed;
  });

  const lifeHealthScore = weightTotal > 0 ? Math.round(weightedSum / weightTotal) : 0;

  const criticalAreas = Object.values(areaResults)
    .filter((r) => r.score < 40)
    .map((r) => r.area);

  // Top 3 ações das áreas mais críticas
  const sortedByScore = Object.values(areaResults)
    .filter((r) => r.status === 'ok')
    .sort((a, b) => a.score - b.score);

  const topPriorities = sortedByScore.slice(0, 3).map((r) => r.topAction);

  return {
    userId,
    evaluatedAt,
    areaResults,
    lifeHealthScore,
    criticalAreas,
    topPriorities,
    totalTokensUsed,
  };
}

export function formatParallelResult(result: ParallelEvalResult): string {
  const criticalStr =
    result.criticalAreas.length > 0 ? result.criticalAreas.join(', ') : 'nenhuma';
  const prioritiesStr = result.topPriorities.join('; ');
  return (
    `🏥 Life Health Score: ${result.lifeHealthScore}/100\n` +
    `⚠️ Áreas críticas: ${criticalStr}\n` +
    `🎯 Prioridades: ${prioritiesStr}`
  );
}
