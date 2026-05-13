/**
 * AGENT EXECUTOR
 * Executa um agente especializado com contexto completo do usuário
 */

import {
  AgentDefinition,
  LifeArea,
  OrchestratorConfig,
  DEFAULT_ORCHESTRATOR,
  getAgentForArea,
  detectAreaFromMessage,
} from './agent-definitions';

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';
const CLAUDE_MODEL = 'claude-sonnet-4-6';

export interface UserContext {
  profile?: {
    name: string;
    objectives?: string[];
    lifeAreas?: string[];
    orchestratorName?: string;
    orchestratorEmoji?: string;
  };
  tasks?: Array<{ title: string; status: string; priority: number; nextStep?: string }>;
  habits?: Array<{ title: string; streak: number; frequency: string; lastCheckin?: string }>;
  goals?: Array<{ title: string; progress: number; deadline?: string; status: string }>;
  finances?: {
    balance: number;
    income: number;
    expenses: number;
    recentTransactions?: Array<{ description: string; amount: number; category: string }>;
  };
  fitness?: {
    lastActivity?: string;
    weeklyActivities?: number;
    goalWeeklyActivities?: number;
  };
  calendar?: Array<{ title: string; date: string; type: string }>;
  insights?: Array<{ content: string; type: string }>;
  memoryContext?: string[];
}

export interface AgentResponse {
  agentId: string;
  agentName: string;
  agentEmoji: string;
  agentColor: string;
  area: LifeArea;
  message: string;
  insights: string[];
  actions: string[];
  urgency: 'low' | 'medium' | 'high';
  confidence: number;
  relatedAreas?: LifeArea[];
  orchestratorName: string;
}

/**
 * Executa um agente específico por área
 */
export async function executeAgent(
  area: LifeArea,
  userMessage: string,
  context: UserContext,
  orchestratorConfig?: Partial<OrchestratorConfig>
): Promise<AgentResponse> {
  const agent = getAgentForArea(area);
  const apiKey = process.env.ANTHROPIC_API_KEY;
  const orchestrator = { ...DEFAULT_ORCHESTRATOR, ...orchestratorConfig };
  const orchestratorName =
    context.profile?.orchestratorName || orchestrator.name;

  if (!apiKey) {
    return generateFallbackResponse(agent, userMessage, context, orchestratorName);
  }

  const contextBlock = buildContextBlock(area, context);
  const userPrompt = `${contextBlock}

MENSAGEM DO USUÁRIO: "${userMessage}"

Responda como ${agent.name} (${agent.fullName}), especialista em ${agent.domain}.
Retorne um JSON com esta estrutura exata:
{
  "message": "resposta principal (máximo 150 palavras, em português)",
  "insights": ["insight 1", "insight 2", "insight 3"],
  "actions": ["ação concreta 1", "ação concreta 2"],
  "urgency": "low|medium|high",
  "relatedAreas": ["area1", "area2"]
}`;

  try {
    const response = await fetch(ANTHROPIC_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: CLAUDE_MODEL,
        max_tokens: 600,
        system: agent.systemPrompt,
        messages: [{ role: 'user', content: userPrompt }],
      }),
    });

    if (!response.ok) throw new Error(`API error: ${response.status}`);

    const data = await response.json();
    const text = data.content?.[0]?.text || '';

    // Extrai JSON da resposta
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON in response');

    const parsed = JSON.parse(jsonMatch[0]);

    return {
      agentId: agent.id,
      agentName: agent.name,
      agentEmoji: agent.emoji,
      agentColor: agent.color,
      area: agent.area,
      message: parsed.message || '',
      insights: parsed.insights || [],
      actions: parsed.actions || [],
      urgency: parsed.urgency || 'medium',
      confidence: 0.92,
      relatedAreas: parsed.relatedAreas || [],
      orchestratorName,
    };
  } catch (err) {
    console.error(`[Agent ${agent.id}] Error:`, err);
    return generateFallbackResponse(agent, userMessage, context, orchestratorName);
  }
}

/**
 * Orquestrador: detecta a área certa e executa o agente especializado
 */
export async function orchestrateWithAgents(
  userMessage: string,
  context: UserContext,
  orchestratorConfig?: Partial<OrchestratorConfig>,
  forceArea?: LifeArea
): Promise<AgentResponse> {
  const area = forceArea || detectAreaFromMessage(userMessage);
  return executeAgent(area, userMessage, context, orchestratorConfig);
}

/**
 * Multi-agent: consulta múltiplos agentes e sintetiza
 */
export async function multiAgentAnalysis(
  context: UserContext,
  orchestratorConfig?: Partial<OrchestratorConfig>
): Promise<AgentResponse[]> {
  const areas: LifeArea[] = ['dashboard', 'tarefas', 'habitos', 'metas'];
  const message = 'Faça uma análise rápida do estado atual desta área e traga o insight mais importante.';

  const results = await Promise.allSettled(
    areas.map((area) => executeAgent(area, message, context, orchestratorConfig))
  );

  return results
    .filter((r): r is PromiseFulfilledResult<AgentResponse> => r.status === 'fulfilled')
    .map((r) => r.value);
}

// ──────────────────────────────────────────────
// HELPERS
// ──────────────────────────────────────────────

function buildContextBlock(area: LifeArea, ctx: UserContext): string {
  const blocks: string[] = [];

  if (ctx.profile) {
    blocks.push(`PERFIL: ${ctx.profile.name} | Objetivos: ${ctx.profile.objectives?.join(', ') || 'não definidos'}`);
  }

  if ((area === 'tarefas' || area === 'dashboard') && ctx.tasks?.length) {
    const summary = ctx.tasks.slice(0, 5).map((t) => `${t.title} [${t.status}] prio:${t.priority}`).join(' | ');
    blocks.push(`TAREFAS: ${summary}`);
  }

  if ((area === 'habitos' || area === 'dashboard') && ctx.habits?.length) {
    const summary = ctx.habits.slice(0, 5).map((h) => `${h.title} streak:${h.streak}`).join(' | ');
    blocks.push(`HÁBITOS: ${summary}`);
  }

  if ((area === 'metas' || area === 'dashboard') && ctx.goals?.length) {
    const summary = ctx.goals.slice(0, 4).map((g) => `${g.title} ${g.progress}%`).join(' | ');
    blocks.push(`METAS: ${summary}`);
  }

  if ((area === 'financeiro' || area === 'dashboard') && ctx.finances) {
    const { balance, income, expenses } = ctx.finances;
    blocks.push(`FINANÇAS: Saldo R$${balance} | Receita R$${income} | Gastos R$${expenses}`);
    if (ctx.finances.recentTransactions?.length) {
      const txs = ctx.finances.recentTransactions.slice(0, 3).map((t) => `${t.description} R$${Math.abs(t.amount)}`).join(' | ');
      blocks.push(`TRANSAÇÕES RECENTES: ${txs}`);
    }
  }

  if ((area === 'fitness' || area === 'dashboard') && ctx.fitness) {
    const { weeklyActivities, goalWeeklyActivities, lastActivity } = ctx.fitness;
    blocks.push(`FITNESS: ${weeklyActivities}/${goalWeeklyActivities} treinos esta semana | Último: ${lastActivity || 'desconhecido'}`);
  }

  if ((area === 'calendario') && ctx.calendar?.length) {
    const events = ctx.calendar.slice(0, 4).map((e) => `${e.title} em ${e.date}`).join(' | ');
    blocks.push(`AGENDA: ${events}`);
  }

  if (ctx.memoryContext?.length) {
    blocks.push(`CONTEXTO ANTERIOR: ${ctx.memoryContext.slice(0, 2).join(' | ')}`);
  }

  return blocks.join('\n');
}

function generateFallbackResponse(
  agent: AgentDefinition,
  message: string,
  context: UserContext,
  orchestratorName: string
): AgentResponse {
  const fallbacks: Record<LifeArea, { message: string; insights: string[]; actions: string[] }> = {
    dashboard: {
      message: `Olá! Sou Leonardo, seu agente de visão sistêmica. Para dar uma análise completa, preciso que você configure sua chave da API Anthropic. Mas já posso dizer: foque nas 3 áreas mais críticas da sua vida hoje.`,
      insights: ['Configure a Claude API para insights personalizados', 'Mantenha equilíbrio entre produção e recuperação'],
      actions: ['Definir as 3 prioridades do dia', 'Revisar metas semanais'],
    },
    tarefas: {
      message: `Sou Franklin. Sem API configurada, não consigo analisar suas tarefas profundamente. Mas a dica de ouro: faça a tarefa mais difícil primeiro, antes das 10h.`,
      insights: ['Tarefas difíceis exigem energia máxima — faça primeiro', 'Limite a 3 tarefas críticas por dia'],
      actions: ['Escolher a tarefa MIT (Most Important Task) do dia', 'Eliminar 1 tarefa que não agrega valor'],
    },
    habitos: {
      message: `Sou Aristóteles. Lembre: "Somos o que fazemos repetidamente." Configure a API para análise completa dos seus streaks.`,
      insights: ['Consistência > intensidade em hábitos', 'Não quebre a corrente — nunca falhe dois dias seguidos'],
      actions: ['Fazer check-in do hábito mais crítico agora', 'Revisar hábitos abandonados esta semana'],
    },
    metas: {
      message: `Sou Alexandre. Nenhuma grande conquista aconteceu sem clareza de destino. Configure a API para análise profunda das suas metas.`,
      insights: ['Metas sem prazo são apenas desejos', 'Progresso de 1% ao dia = 37x melhor em 1 ano'],
      actions: ['Verificar progresso das metas desta semana', 'Definir o próximo marco mensurável'],
    },
    financeiro: {
      message: `Sou Adam Smith. A riqueza começa com clareza dos seus números. Configure a API para análise financeira completa.`,
      insights: ['Gaste menos do que ganha — sempre', 'Rastreie gastos por 30 dias antes de otimizar'],
      actions: ['Categorizar as últimas 5 transações', 'Calcular taxa de poupança atual'],
    },
    fitness: {
      message: `Sou Hipócrates. Qualquer movimento é melhor que nenhum. Configure a API para análise completa de saúde.`,
      insights: ['30 min de caminhada tem impacto comprovado no humor', 'Sono é a base de todo o resto'],
      actions: ['Fazer 10 min de movimento agora', 'Planejar treino para amanhã'],
    },
    calendario: {
      message: `Sou Newton. O tempo é a variável mais escassa. Configure a API para otimização completa da sua agenda.`,
      insights: ['Reuniões sem agenda clara são desperdício', 'Proteja blocos de foco no calendário'],
      actions: ['Bloquear 2h de deep work amanhã', 'Revisar compromissos da semana'],
    },
    insights: {
      message: `Sou Sócrates. "Conhece-te a ti mesmo." Configure a API para insights personalizados baseados nos seus dados.`,
      insights: ['Padrões se revelam quando você para para observar', 'Pergunte "por quê?" 5 vezes para chegar à raiz'],
      actions: ['Escrever 3 observações sobre a semana passada', 'Identificar 1 padrão que quer mudar'],
    },
    foco: {
      message: `Sou Tesla. Foco é superpoder. Configure a API para análise do seu estado de flow e produtividade.`,
      insights: ['2h de foco profundo > 8h fragmentadas', 'Celular fora do campo de visão = +40% de produtividade'],
      actions: ['Iniciar sessão Pomodoro de 25 min agora', 'Silenciar notificações por 2 horas'],
    },
    perfil: {
      message: `Sou Marco Aurélio. "O que perturbas não são os fatos, mas as opiniões que tens sobre eles." Configure a API para análise profunda do seu desenvolvimento.`,
      insights: ['Quem você quer ser em 5 anos começa hoje', 'Seus hábitos revelam seus valores reais'],
      actions: ['Escrever 3 valores que guiam suas decisões', 'Avaliar se ações desta semana refletem esses valores'],
    },
  };

  const fb = fallbacks[agent.area];
  return {
    agentId: agent.id,
    agentName: agent.name,
    agentEmoji: agent.emoji,
    agentColor: agent.color,
    area: agent.area,
    message: fb.message,
    insights: fb.insights,
    actions: fb.actions,
    urgency: 'medium',
    confidence: 0.5,
    orchestratorName,
  };
}
