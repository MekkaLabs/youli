/**
 * YOULI ORCHESTRATOR SERVICE
 * O "Jarvis" do usuário — orquestrador central que roteia para agentes especializados,
 * sintetiza respostas e mantém contexto de vida completo.
 *
 * Nome customizável pelo usuário (padrão: "Youli")
 */

import {
  LifeArea,
  OrchestratorConfig,
  DEFAULT_ORCHESTRATOR,
  getAllAgents,
  detectAreaFromMessage,
} from './agent-definitions';
import {
  executeAgent,
  multiAgentAnalysis,
  orchestrateWithAgents,
  UserContext,
  AgentResponse,
} from './agent-executor';

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';
const CLAUDE_MODEL = 'claude-sonnet-4-6';

export interface OrchestratorResponse {
  orchestratorName: string;
  orchestratorEmoji: string;
  primaryAgent: AgentResponse;
  synthesis: string;           // Síntese do orquestrador
  additionalInsights?: AgentResponse[]; // Insights de outros agentes quando relevante
  suggestedAgents: Array<{     // Agentes que o usuário pode consultar
    area: LifeArea;
    name: string;
    emoji: string;
    reason: string;
  }>;
  mood: 'encouraging' | 'alert' | 'celebratory' | 'analytical';
  nextSteps: string[];
}

/**
 * Busca configuração do orquestrador salva (AsyncStorage no mobile / API)
 */
export function getOrchestratorConfig(overrides?: Partial<OrchestratorConfig>): OrchestratorConfig {
  return {
    ...DEFAULT_ORCHESTRATOR,
    ...overrides,
  };
}

/**
 * Orquestração completa: roteamento + síntese + sugestões
 */
export async function runOrchestrator(
  userMessage: string,
  context: UserContext,
  orchestratorConfig?: Partial<OrchestratorConfig>
): Promise<OrchestratorResponse> {
  const config = getOrchestratorConfig(orchestratorConfig);
  const orchName = context.profile?.orchestratorName || config.name;
  const orchEmoji = context.profile?.orchestratorEmoji || config.emoji;

  // Detecta área primária
  const primaryArea = detectAreaFromMessage(userMessage);

  // Executa agente primário
  const primaryAgent = await orchestrateWithAgents(
    userMessage,
    context,
    orchestratorConfig,
    primaryArea
  );

  // Determina agentes relacionados para sugestão
  const suggestedAgents = getSuggestedAgents(primaryArea, context);

  // Síntese do orquestrador (uma camada acima dos agentes)
  const synthesis = await synthesize(orchName, primaryAgent, userMessage, context);

  // Determina humor/tom da resposta
  const mood = determineMood(context, primaryAgent);

  // Próximos passos consolidados
  const nextSteps = consolidateNextSteps(primaryAgent);

  return {
    orchestratorName: orchName,
    orchestratorEmoji: orchEmoji,
    primaryAgent,
    synthesis,
    suggestedAgents,
    mood,
    nextSteps,
  };
}

/**
 * Análise matinal: orquestrador consulta todos os agentes principais e faz briefing do dia
 */
export async function morningBriefing(
  context: UserContext,
  orchestratorConfig?: Partial<OrchestratorConfig>
): Promise<OrchestratorResponse> {
  const config = getOrchestratorConfig(orchestratorConfig);
  const orchName = context.profile?.orchestratorName || config.name;
  const orchEmoji = context.profile?.orchestratorEmoji || config.emoji;

  // Consulta agentes principais em paralelo
  const agentResponses = await multiAgentAnalysis(context, orchestratorConfig);

  // Agente primário é o de dashboard (visão geral)
  const primaryAgent = agentResponses.find((r) => r.area === 'dashboard') || agentResponses[0];

  // Síntese do briefing matinal
  const synthesis = await synthesizeMorningBriefing(orchName, agentResponses, context);

  return {
    orchestratorName: orchName,
    orchestratorEmoji: orchEmoji,
    primaryAgent,
    synthesis,
    additionalInsights: agentResponses.filter((r) => r.area !== 'dashboard'),
    suggestedAgents: [],
    mood: determineMood(context, primaryAgent),
    nextSteps: agentResponses.flatMap((r) => r.actions).slice(0, 4),
  };
}

// ──────────────────────────────────────────────
// HELPERS INTERNOS
// ──────────────────────────────────────────────

async function synthesize(
  orchName: string,
  primaryAgent: AgentResponse,
  userMessage: string,
  context: UserContext
): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    return `${orchName} aqui. ${primaryAgent.agentName} analisou sua situação. ${primaryAgent.message}`;
  }

  const prompt = `Você é ${orchName}, o assistente pessoal de vida do usuário — como o Jarvis do Homem de Ferro, mas para gestão de vida.

O agente especialista ${primaryAgent.agentName} (${primaryAgent.area}) acabou de responder:
"${primaryAgent.message}"

Pergunta do usuário: "${userMessage}"

Crie uma síntese de 1-2 frases como ${orchName} que:
1. Contextualiza a resposta do agente de forma pessoal
2. Adiciona uma perspectiva de visão geral que o agente especialista não viu
3. É caloroso, direto e motivador

Responda APENAS as 1-2 frases de síntese, sem JSON, em português do Brasil.`;

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
        max_tokens: 150,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    const data = await response.json();
    return data.content?.[0]?.text || `${orchName}: ${primaryAgent.message}`;
  } catch {
    return `${orchName} consultou ${primaryAgent.agentName}: ${primaryAgent.message}`;
  }
}

async function synthesizeMorningBriefing(
  orchName: string,
  agents: AgentResponse[],
  context: UserContext
): Promise<string> {
  const name = context.profile?.name || 'você';
  const summaries = agents.map((a) => `${a.agentName}: ${a.insights[0] || a.message}`).join('. ');

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return `Bom dia, ${name}! ${orchName} aqui com seu briefing. ${summaries}`;
  }

  const prompt = `Você é ${orchName}, o assistente pessoal de vida de ${name}.
  
Resumos dos agentes especializados esta manhã:
${summaries}

Crie um briefing matinal de 3 frases que:
1. Cumprimenta ${name} pelo nome com energia positiva
2. Destaca o insight mais crítico do dia (das análises acima)
3. Define o foco principal para as próximas horas

Tom: como Jarvis do Tony Stark — inteligente, caloroso, sem enrolação. Em português do Brasil.`;

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
        max_tokens: 200,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    const data = await response.json();
    return data.content?.[0]?.text || `Bom dia, ${name}! ${orchName} aqui.`;
  } catch {
    return `Bom dia, ${name}! ${orchName} aqui com seu briefing matinal.`;
  }
}

function getSuggestedAgents(
  primaryArea: LifeArea,
  context: UserContext
): OrchestratorResponse['suggestedAgents'] {
  const all = getAllAgents();
  const suggestions: OrchestratorResponse['suggestedAgents'] = [];

  const reasonMap: Partial<Record<LifeArea, string>> = {
    tarefas: 'Suas tarefas impactam suas metas',
    habitos: 'Hábitos são a base de toda produtividade',
    financeiro: 'Finanças influenciam suas decisões',
    metas: 'Suas metas definem suas prioridades',
    foco: 'Foco determina o que você executa',
    fitness: 'Saúde afeta energia e desempenho',
    calendario: 'Agenda define o que é possível',
    insights: 'Padrões revelam o que não vemos',
  };

  // Sugere 3 agentes complementares ao primário
  const complements = all
    .filter((a) => a.area !== primaryArea)
    .slice(0, 3);

  for (const agent of complements) {
    suggestions.push({
      area: agent.area,
      name: agent.name,
      emoji: agent.emoji,
      reason: reasonMap[agent.area] || `Consultar ${agent.name} sobre ${agent.domain}`,
    });
  }

  return suggestions;
}

function determineMood(
  context: UserContext,
  agent: AgentResponse
): OrchestratorResponse['mood'] {
  if (agent.urgency === 'high') return 'alert';

  const hasGoodHabits = context.habits?.some((h) => h.streak >= 7);
  const hasGoodGoals = context.goals?.some((g) => g.progress >= 80);

  if (hasGoodHabits || hasGoodGoals) return 'celebratory';
  if (agent.urgency === 'low') return 'analytical';

  return 'encouraging';
}

function consolidateNextSteps(agent: AgentResponse): string[] {
  return [...agent.actions, ...agent.insights.slice(0, 1)].slice(0, 4);
}
