/**
 * Life Requirements Doc Generator — SWE-CI-inspired Architect Agent Output
 * Gera documentos formais de requisitos de mudança de vida.
 * Inspirado no padrão "Architect Agent → Requirement Docs → Programmer Agent" do SWE-CI.
 */
import fs from 'node:fs';
import path from 'node:path';

export interface LifeRequirementDoc {
  id: string;
  area: string;
  title: string;
  problemStatement: string;
  rootCauses: string[];
  proposedSolution: string;
  acceptanceCriteria: string[];
  constraints: string[];
  estimatedEffort: 'days' | 'weeks' | 'months';
  priority: 'critical' | 'high' | 'medium' | 'low';
  createdAt: string;
  gapMagnitude: number;
}

export interface RequirementDocStore {
  userId: string;
  docs: LifeRequirementDoc[];
  updatedAt: string;
}

type GapParam = {
  area: string;
  metric: string;
  currentValue: number | string;
  targetValue: number | string;
  gapMagnitude: number;
  priority: string;
  requirement: string;
  estimatedDays: number;
};

const ROOT_CAUSES_BY_AREA: Record<string, string[]> = {
  habitos: [
    'Falta de rotina consistente',
    'Baixa energia no período crítico',
    'Ausência de gatilhos ambientais',
  ],
  metas: [
    'Metas vagas sem critérios mensuráveis',
    'Falta de acompanhamento regular',
    'Ausência de marcos intermediários',
  ],
  financeiro: [
    'Gastos impulsivos não planejados',
    'Falta de orçamento definido por categoria',
    'Ausência de reserva de emergência',
  ],
  fitness: [
    'Falta de plano de treino estruturado',
    'Recuperação insuficiente entre sessões',
    'Motivação dependente de fatores externos',
  ],
  tarefas: [
    'Sobrecarga de tarefas sem priorização',
    'Falta de time-blocking na agenda',
    'Interrupções frequentes no fluxo de trabalho',
  ],
  calendario: [
    'Compromissos não alinhados com prioridades',
    'Falta de blocos de tempo protegidos',
    'Ausência de revisão semanal da agenda',
  ],
  insights: [
    'Dados insuficientes para análise de padrões',
    'Falta de reflexão periódica sobre métricas',
    'Ausência de correlação entre áreas da vida',
  ],
  foco: [
    'Distrações digitais frequentes',
    'Ambiente não otimizado para concentração',
    'Falta de sessões de deep work planejadas',
  ],
  perfil: [
    'Metas pessoais não documentadas',
    'Falta de clareza sobre valores e prioridades',
    'Ausência de revisão periódica do perfil',
  ],
  dashboard: [
    'Métricas não monitoradas regularmente',
    'Falta de visão integrada das áreas',
    'Ausência de alertas proativos',
  ],
};

const ACCEPTANCE_CRITERIA_BY_AREA: Record<string, string[]> = {
  habitos: [
    'Streak >= 7 dias consecutivos',
    'Check-in realizado no horário definido por 5 dias',
    'Taxa de conclusão >= 80% nas últimas 2 semanas',
  ],
  metas: [
    'Progresso registrado pelo menos 1x por semana',
    'Marco intermediário atingido dentro do prazo',
    'Score de progresso >= 60% em 30 dias',
  ],
  financeiro: [
    'Gasto mensal dentro do orçamento por 4 semanas consecutivas',
    'Reserva de emergência >= 1 mês de despesas',
    'Saldo positivo ao final do mês',
  ],
  fitness: [
    'Frequência de treino >= 3x por semana por 4 semanas',
    'Evolução de carga ou repetições em 21 dias',
    'Tempo de atividade acumulado >= meta semanal',
  ],
  tarefas: [
    'Taxa de conclusão de tarefas prioritárias >= 70%',
    'Backlog reduzido em 30% em 2 semanas',
    'Nenhuma tarefa crítica atrasada por mais de 2 dias',
  ],
  calendario: [
    'Blocos de foco protegidos em >= 4 dias por semana',
    'Conflitos de agenda eliminados por 2 semanas',
    'Revisão semanal realizada por 4 semanas consecutivas',
  ],
  foco: [
    'Sessão de deep work >= 90 minutos por dia em 5 dias',
    'Score de foco >= 7 em sessões registradas',
    'Distrações reduzidas em 50% em 2 semanas',
  ],
  insights: [
    'Relatório semanal gerado por 4 semanas consecutivas',
    'Ao menos 2 insights acionáveis identificados por semana',
    'Dados de todas as áreas preenchidos por 7 dias',
  ],
  perfil: [
    'Perfil atualizado com metas para os próximos 3 meses',
    'Valores e prioridades documentados e revisados',
    'Foto e informações básicas completas',
  ],
  dashboard: [
    'Todas as métricas principais com dados <= 24h de defasagem',
    'Visualização do dashboard acessada >= 5x por semana',
    'Alertas configurados para métricas críticas',
  ],
};

function getEstimatedEffort(estimatedDays: number): 'days' | 'weeks' | 'months' {
  if (estimatedDays < 7) return 'days';
  if (estimatedDays < 30) return 'weeks';
  return 'months';
}

function getPriorityFromString(priority: string): LifeRequirementDoc['priority'] {
  const p = priority.toLowerCase();
  if (p === 'critical') return 'critical';
  if (p === 'high') return 'high';
  if (p === 'medium') return 'medium';
  return 'low';
}

export function generateRequirementDoc(gap: GapParam): LifeRequirementDoc {
  const id = `req_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  const areaKey = gap.area.toLowerCase();

  const problemStatement = `${gap.area} — ${gap.metric}: atual ${gap.currentValue}, meta ${gap.targetValue} (gap de ${Math.round(gap.gapMagnitude * 100)}%)`;

  const rootCauses = ROOT_CAUSES_BY_AREA[areaKey] ?? [
    'Falta de clareza sobre o objetivo',
    'Ausência de acompanhamento sistemático',
    'Recursos insuficientes alocados para a área',
  ];

  const proposedSolution = gap.requirement;

  const allCriteria = ACCEPTANCE_CRITERIA_BY_AREA[areaKey] ?? [
    'Progresso mensurável registrado em 7 dias',
    'Meta atingida dentro do prazo estimado',
    'Revisão realizada semanalmente',
  ];
  const acceptanceCriteria = allCriteria.slice(0, 3);

  const constraints = [
    `Prazo estimado: ${gap.estimatedDays} dias`,
    'Não deve impactar negativamente outras áreas da vida',
    'Implementação deve ser sustentável a longo prazo',
  ];

  return {
    id,
    area: gap.area,
    title: `Redução de gap em ${gap.metric} — ${gap.area}`,
    problemStatement,
    rootCauses,
    proposedSolution,
    acceptanceCriteria,
    constraints,
    estimatedEffort: getEstimatedEffort(gap.estimatedDays),
    priority: getPriorityFromString(gap.priority),
    createdAt: new Date().toISOString(),
    gapMagnitude: gap.gapMagnitude,
  };
}

export async function generateRequirementDocWithAI(
  gap: GapParam,
  context: Record<string, unknown>
): Promise<LifeRequirementDoc> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return generateRequirementDoc(gap);
  }

  try {
    const prompt = `Você é um Life Architect. Analise este gap de vida: ${JSON.stringify(gap)}. Gere um documento de requisitos estruturado com: problemStatement, rootCauses (array), proposedSolution, acceptanceCriteria (array mensurável), estimatedEffort. Retorne APENAS JSON.`;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5',
        max_tokens: 1024,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!response.ok) {
      throw new Error(`Anthropic API error: ${response.status}`);
    }

    const data = (await response.json()) as {
      content: Array<{ type: string; text: string }>;
    };
    const text = data.content[0]?.text ?? '';

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON in response');

    const parsed = JSON.parse(jsonMatch[0]) as Partial<{
      problemStatement: string;
      rootCauses: string[];
      proposedSolution: string;
      acceptanceCriteria: string[];
      estimatedEffort: string;
    }>;

    const base = generateRequirementDoc(gap);

    return {
      ...base,
      problemStatement: parsed.problemStatement ?? base.problemStatement,
      rootCauses: Array.isArray(parsed.rootCauses) ? parsed.rootCauses : base.rootCauses,
      proposedSolution: parsed.proposedSolution ?? base.proposedSolution,
      acceptanceCriteria: Array.isArray(parsed.acceptanceCriteria)
        ? parsed.acceptanceCriteria
        : base.acceptanceCriteria,
      estimatedEffort:
        parsed.estimatedEffort === 'days' ||
        parsed.estimatedEffort === 'weeks' ||
        parsed.estimatedEffort === 'months'
          ? parsed.estimatedEffort
          : base.estimatedEffort,
    };
  } catch {
    return generateRequirementDoc(gap);
  }
}

function getDataDir(): string {
  return path.join(process.cwd(), '.data');
}

function ensureDataDir(): void {
  const dir = getDataDir();
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function getStorePath(userId: string): string {
  return path.join(getDataDir(), `requirements-${userId}.json`);
}

function loadStore(userId: string): RequirementDocStore {
  const filePath = getStorePath(userId);
  if (!fs.existsSync(filePath)) {
    return { userId, docs: [], updatedAt: new Date().toISOString() };
  }
  try {
    const raw = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(raw) as RequirementDocStore;
  } catch {
    return { userId, docs: [], updatedAt: new Date().toISOString() };
  }
}

export function saveRequirementDoc(userId: string, doc: LifeRequirementDoc): void {
  ensureDataDir();
  const store = loadStore(userId);
  const existing = store.docs.findIndex((d) => d.id === doc.id);
  if (existing >= 0) {
    store.docs[existing] = doc;
  } else {
    store.docs.push(doc);
  }
  store.updatedAt = new Date().toISOString();
  fs.writeFileSync(getStorePath(userId), JSON.stringify(store, null, 2), 'utf-8');
}

export function loadRequirementDocs(userId: string): LifeRequirementDoc[] {
  return loadStore(userId).docs;
}

export function getDocsByArea(userId: string, area: string): LifeRequirementDoc[] {
  return loadStore(userId).docs.filter(
    (d) => d.area.toLowerCase() === area.toLowerCase()
  );
}

export function validateRequirementDoc(doc: LifeRequirementDoc): boolean {
  if (!doc.acceptanceCriteria || doc.acceptanceCriteria.length === 0) return false;
  const measurablePattern = /\d|data|prazo|semana|dia|mês|%|>=|<=|>/i;
  return doc.acceptanceCriteria.some((c) => measurablePattern.test(c));
}
