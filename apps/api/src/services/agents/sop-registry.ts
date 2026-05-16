import type { LifeArea } from './agent-definitions';

export interface SOPStep {
  id: string;
  name: string;
  promptFocus: string;
  outputFields: string[];
  model: 'fast' | 'strong';
}

export interface LifeAreaSOP {
  area: LifeArea;
  steps: SOPStep[];
}

const VALIDATE_STEP_FOCUS =
  'Verifique se a resposta anterior atende ao critério: acionável, específica e baseada em dados reais do usuário.';

const SOP_REGISTRY: Record<LifeArea, LifeAreaSOP> = {
  dashboard: {
    area: 'dashboard',
    steps: [
      {
        id: 'assess_energy',
        name: 'Avaliar Energia',
        promptFocus: 'Avalie o nível de energia e disposição atual do usuário com base nos dados de hábitos, sono e atividade física disponíveis.',
        outputFields: ['energyLevel', 'energyDrivers', 'energyBlockers'],
        model: 'fast',
      },
      {
        id: 'plan_day',
        name: 'Planejar Dia',
        promptFocus: 'Com base no nível de energia avaliado, proponha um plano de dia realista, priorizando as tarefas mais importantes e respeitando os limites do usuário.',
        outputFields: ['morningBlocks', 'afternoonBlocks', 'eveningBlocks', 'priorityTask'],
        model: 'strong',
      },
      {
        id: 'synthesize_priorities',
        name: 'Sintetizar Prioridades',
        promptFocus: VALIDATE_STEP_FOCUS,
        outputFields: ['topPriorities', 'summary', 'nextAction'],
        model: 'fast',
      },
    ],
  },

  tarefas: {
    area: 'tarefas',
    steps: [
      {
        id: 'assess_backlog',
        name: 'Avaliar Backlog',
        promptFocus: 'Analise o backlog de tarefas do usuário: quantidade, status, prioridades e prazo. Identifique padrões de acúmulo ou bloqueios.',
        outputFields: ['totalTasks', 'overdueCount', 'highPriorityCount', 'blockedTasks'],
        model: 'fast',
      },
      {
        id: 'prioritize',
        name: 'Priorizar',
        promptFocus: 'Ordene as tarefas por impacto e urgência usando a matriz de Eisenhower. Destaque as 3 tarefas mais importantes para hoje.',
        outputFields: ['top3Tasks', 'deferredTasks', 'delegatedTasks'],
        model: 'strong',
      },
      {
        id: 'generate_action',
        name: 'Gerar Ação',
        promptFocus: 'Para cada tarefa prioritária, gere um próximo passo concreto e executável com tempo estimado.',
        outputFields: ['actionItems', 'estimatedMinutes', 'dependencies'],
        model: 'strong',
      },
      {
        id: 'validate',
        name: 'Validar',
        promptFocus: VALIDATE_STEP_FOCUS,
        outputFields: ['validatedActions', 'adjustments', 'finalSummary'],
        model: 'fast',
      },
    ],
  },

  habitos: {
    area: 'habitos',
    steps: [
      {
        id: 'assess_streak',
        name: 'Avaliar Streak',
        promptFocus: 'Analise os streaks atuais de hábitos do usuário. Identifique quais estão em risco (streak < 3) e quais estão saudáveis (streak >= 7).',
        outputFields: ['atRiskHabits', 'healthyHabits', 'longestStreak', 'averageStreak'],
        model: 'fast',
      },
      {
        id: 'identify_gap',
        name: 'Identificar Gap',
        promptFocus: 'Identifique o principal gap comportamental do usuário: qual hábito tem maior impacto potencial e está sendo negligenciado?',
        outputFields: ['primaryGap', 'gapImpact', 'rootCause'],
        model: 'strong',
      },
      {
        id: 'propose_habit',
        name: 'Propor Hábito',
        promptFocus: 'Proponha uma intervenção concreta para reforçar o hábito em risco ou preencher o gap identificado. Use ancoragem de hábitos (habit stacking) quando possível.',
        outputFields: ['habitProposal', 'anchorHabit', 'implementation', 'weeklyGoal'],
        model: 'strong',
      },
      {
        id: 'validate',
        name: 'Validar',
        promptFocus: VALIDATE_STEP_FOCUS,
        outputFields: ['validatedProposal', 'adjustments', 'finalSummary'],
        model: 'fast',
      },
    ],
  },

  metas: {
    area: 'metas',
    steps: [
      {
        id: 'assess_progress',
        name: 'Avaliar Progresso',
        promptFocus: 'Analise o progresso atual de todas as metas do usuário. Calcule percentuais, prazos restantes e velocidade de progresso.',
        outputFields: ['goalsOnTrack', 'goalsBehind', 'goalsCompleted', 'overallProgress'],
        model: 'fast',
      },
      {
        id: 'identify_blocker',
        name: 'Identificar Bloqueador',
        promptFocus: 'Para as metas abaixo do esperado, identifique o principal bloqueador: falta de clareza, recursos, motivação ou tempo.',
        outputFields: ['primaryBlocker', 'affectedGoals', 'blockerCategory'],
        model: 'strong',
      },
      {
        id: 'plan_milestone',
        name: 'Planejar Marco',
        promptFocus: 'Defina o próximo marco concreto para a meta mais crítica. Inclua critério de sucesso, prazo e 3 ações necessárias.',
        outputFields: ['nextMilestone', 'successCriteria', 'deadline', 'requiredActions'],
        model: 'strong',
      },
      {
        id: 'validate',
        name: 'Validar',
        promptFocus: VALIDATE_STEP_FOCUS,
        outputFields: ['validatedMilestone', 'adjustments', 'finalSummary'],
        model: 'fast',
      },
    ],
  },

  financeiro: {
    area: 'financeiro',
    steps: [
      {
        id: 'assess_balance',
        name: 'Avaliar Saldo',
        promptFocus: 'Analise o balanço financeiro atual: receitas, despesas, saldo e tendência dos últimos 30 dias.',
        outputFields: ['currentBalance', 'monthlyIncome', 'monthlyExpenses', 'savingsRate', 'trend'],
        model: 'fast',
      },
      {
        id: 'analyze_spending',
        name: 'Analisar Gastos',
        promptFocus: 'Identifique as categorias de maior gasto e compare com benchmarks saudáveis. Destaque anomalias ou gastos acima do padrão.',
        outputFields: ['topCategories', 'anomalies', 'overspendingAreas', 'potentialSavings'],
        model: 'strong',
      },
      {
        id: 'propose_action',
        name: 'Propor Ação',
        promptFocus: 'Proponha 2-3 ações financeiras concretas para melhorar o balanço ou reduzir riscos. Priorize por impacto e facilidade de execução.',
        outputFields: ['proposedActions', 'projectedImpact', 'implementationSteps'],
        model: 'strong',
      },
      {
        id: 'validate',
        name: 'Validar',
        promptFocus: VALIDATE_STEP_FOCUS,
        outputFields: ['validatedActions', 'adjustments', 'finalSummary'],
        model: 'fast',
      },
    ],
  },

  fitness: {
    area: 'fitness',
    steps: [
      {
        id: 'assess_activity',
        name: 'Avaliar Atividade',
        promptFocus: 'Analise o nível de atividade física atual: frequência semanal, tipos de treino e comparação com a meta estabelecida.',
        outputFields: ['weeklyActivities', 'goalActivities', 'activityGap', 'lastWorkout'],
        model: 'fast',
      },
      {
        id: 'identify_gap',
        name: 'Identificar Gap',
        promptFocus: 'Identifique o principal gap de fitness: frequência, intensidade, variedade ou recuperação inadequada.',
        outputFields: ['primaryGap', 'gapType', 'riskFactors'],
        model: 'strong',
      },
      {
        id: 'propose_workout',
        name: 'Propor Treino',
        promptFocus: 'Proponha um plano de treino para os próximos 7 dias que preencha o gap identificado, respeitando a capacidade atual do usuário.',
        outputFields: ['weeklyPlan', 'workoutDetails', 'restDays', 'progressionGoal'],
        model: 'strong',
      },
      {
        id: 'validate',
        name: 'Validar',
        promptFocus: VALIDATE_STEP_FOCUS,
        outputFields: ['validatedPlan', 'adjustments', 'finalSummary'],
        model: 'fast',
      },
    ],
  },

  calendario: {
    area: 'calendario',
    steps: [
      {
        id: 'assess_schedule',
        name: 'Avaliar Agenda',
        promptFocus: 'Analise a agenda atual: densidade de compromissos, distribuição ao longo da semana e blocos de tempo livre disponíveis.',
        outputFields: ['totalEvents', 'busyBlocks', 'freeBlocks', 'overloadedDays'],
        model: 'fast',
      },
      {
        id: 'identify_conflicts',
        name: 'Identificar Conflitos',
        promptFocus: 'Identifique conflitos de agenda, sobreposições, ou dias excessivamente carregados que impactam a produtividade.',
        outputFields: ['conflicts', 'overloadedPeriods', 'missingBuffers'],
        model: 'strong',
      },
      {
        id: 'optimize_blocks',
        name: 'Otimizar Blocos',
        promptFocus: 'Proponha otimizações concretas de agenda: reagendamentos, blocos de foco protegido e buffers de recuperação.',
        outputFields: ['rescheduleProposals', 'focusBlocks', 'bufferTimes', 'weeklyStructure'],
        model: 'strong',
      },
      {
        id: 'validate',
        name: 'Validar',
        promptFocus: VALIDATE_STEP_FOCUS,
        outputFields: ['validatedSchedule', 'adjustments', 'finalSummary'],
        model: 'fast',
      },
    ],
  },

  insights: {
    area: 'insights',
    steps: [
      {
        id: 'assess_patterns',
        name: 'Avaliar Padrões',
        promptFocus: 'Analise padrões emergentes nos dados do usuário: correlações entre hábitos, produtividade, energia e resultados ao longo do tempo.',
        outputFields: ['detectedPatterns', 'patternStrength', 'dataPeriod'],
        model: 'strong',
      },
      {
        id: 'cross_correlate',
        name: 'Correlacionar Cross-Área',
        promptFocus: 'Identifique correlações entre diferentes áreas de vida: como o sono afeta a produtividade, como o exercício impacta o humor, etc.',
        outputFields: ['crossAreaCorrelations', 'strongestLink', 'unexpectedInsight'],
        model: 'strong',
      },
      {
        id: 'synthesize_insight',
        name: 'Sintetizar Insight',
        promptFocus: 'Sintetize o insight mais valioso e acionável com base nas correlações identificadas. O insight deve ser surpreendente e específico.',
        outputFields: ['primaryInsight', 'supportingData', 'actionableConclusion'],
        model: 'strong',
      },
      {
        id: 'validate',
        name: 'Validar',
        promptFocus: VALIDATE_STEP_FOCUS,
        outputFields: ['validatedInsight', 'adjustments', 'finalSummary'],
        model: 'fast',
      },
    ],
  },

  foco: {
    area: 'foco',
    steps: [
      {
        id: 'assess_distractions',
        name: 'Avaliar Distrações',
        promptFocus: 'Avalie os principais fatores de distração e interrupção do usuário com base nas tarefas em progresso e contexto atual.',
        outputFields: ['activeDistractions', 'interruptionSources', 'focusScore'],
        model: 'fast',
      },
      {
        id: 'identify_priority',
        name: 'Identificar Prioridade',
        promptFocus: 'Identifique a única tarefa mais importante que o usuário deve focar agora (Most Important Task). Justifique a escolha.',
        outputFields: ['mostImportantTask', 'justification', 'estimatedDuration'],
        model: 'strong',
      },
      {
        id: 'create_focus_plan',
        name: 'Criar Plano de Foco',
        promptFocus: 'Crie um plano de sessão de foco profundo: técnica (Pomodoro, deep work, etc.), duração, ambiente e como eliminar as distrações identificadas.',
        outputFields: ['focusTechnique', 'sessionDuration', 'environmentSetup', 'distractionElimination'],
        model: 'strong',
      },
      {
        id: 'validate',
        name: 'Validar',
        promptFocus: VALIDATE_STEP_FOCUS,
        outputFields: ['validatedPlan', 'adjustments', 'finalSummary'],
        model: 'fast',
      },
    ],
  },

  perfil: {
    area: 'perfil',
    steps: [
      {
        id: 'assess_growth',
        name: 'Avaliar Crescimento',
        promptFocus: 'Avalie o crescimento pessoal do usuário: progresso nos objetivos de vida, desenvolvimento de habilidades e evolução das áreas prioritárias.',
        outputFields: ['growthAreas', 'stagnantAreas', 'overallGrowthScore'],
        model: 'fast',
      },
      {
        id: 'review_objectives',
        name: 'Revisar Objetivos',
        promptFocus: 'Revise os objetivos de vida atuais do usuário: ainda são relevantes? Estão alinhados com as prioridades declaradas? Há conflitos entre eles?',
        outputFields: ['relevantObjectives', 'outdatedObjectives', 'conflictingObjectives', 'alignmentScore'],
        model: 'strong',
      },
      {
        id: 'propose_update',
        name: 'Propor Atualização',
        promptFocus: 'Proponha atualizações no perfil ou objetivos do usuário para melhor refletir seu estado atual e aspirações futuras.',
        outputFields: ['profileUpdates', 'newObjectives', 'archivedObjectives', 'nextReviewDate'],
        model: 'strong',
      },
      {
        id: 'validate',
        name: 'Validar',
        promptFocus: VALIDATE_STEP_FOCUS,
        outputFields: ['validatedUpdates', 'adjustments', 'finalSummary'],
        model: 'fast',
      },
    ],
  },
};

export function getSOPForArea(area: LifeArea): LifeAreaSOP {
  return SOP_REGISTRY[area];
}

export function getAllSOPs(): LifeAreaSOP[] {
  return Object.values(SOP_REGISTRY);
}
