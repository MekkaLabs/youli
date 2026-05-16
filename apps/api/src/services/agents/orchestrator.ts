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
  PERSONA_AREA_MAP,
  getAllAgents,
  detectAreaFromMessage,
} from './agent-definitions';
import {
  multiAgentAnalysis,
  orchestrateWithAgents,
  UserContext,
  AgentResponse,
} from './agent-executor';
import { runOrchestratorGraph } from './langgraph-orchestrator';
import { resumeOrchestratorGraph } from './langgraph-orchestrator';
import { pickModel } from '../kernel/model-policy';
import { appendEvent } from './event-stream';
import { createApproval } from './approval-queue';

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';

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
  graph?: {
    threadId: string;
    area: LifeArea;
    events: string[];
    workflowVersion?: number;
    checkpointStatus: 'completed' | 'interrupted';
  };
  handoff?: {
    area: LifeArea;
    reason: string;
    agentName: string;
  };
  interrupted?: {
    reason: string;
  };
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
  orchestratorConfig?: Partial<OrchestratorConfig>,
  options?: { threadId?: string; allowResume?: boolean }
): Promise<OrchestratorResponse> {
  const config = getOrchestratorConfig(orchestratorConfig);
  const orchName = context.profile?.orchestratorName || config.name;
  const orchEmoji = context.profile?.orchestratorEmoji || config.emoji;
  const threadId = options?.threadId || `thread_${Date.now()}`;
  appendEvent({
    threadId,
    type: 'user_message',
    payload: { message: userMessage, allowResume: options?.allowResume || false }
  });

  try {
    const graphResult = options?.allowResume
      ? await resumeOrchestratorGraph({
          threadId,
          userMessage,
          context,
          orchestratorConfig,
          allowResume: options?.allowResume
        }) || await runOrchestratorGraph({
          threadId,
          userMessage,
          context,
          orchestratorConfig,
          allowResume: options?.allowResume,
        })
      : await runOrchestratorGraph({
          threadId,
          userMessage,
          context,
          orchestratorConfig,
          allowResume: options?.allowResume,
        });

    const synthesis = await synthesize(orchName, graphResult.primaryAgent, userMessage, context);
    appendEvent({
      threadId,
      type: 'agent_response',
      area: graphResult.primaryArea,
      payload: {
        synthesis,
        primaryAgent: graphResult.primaryAgent.agentName,
        interrupted: false
      }
    });
    return {
      orchestratorName: orchName,
      orchestratorEmoji: orchEmoji,
      primaryAgent: graphResult.primaryAgent,
      synthesis,
      suggestedAgents: graphResult.suggestedAgents,
      mood: graphResult.mood,
      nextSteps: graphResult.nextSteps,
      graph: {
        threadId,
        area: graphResult.primaryArea,
        events: graphResult.events,
        workflowVersion: graphResult.workflowVersion,
        checkpointStatus: 'completed'
      },
      handoff: graphResult.handoffAgent && graphResult.handoffArea && graphResult.handoffReason
        ? {
            area: graphResult.handoffArea,
            reason: graphResult.handoffReason,
            agentName: graphResult.handoffAgent.agentName,
          }
        : undefined
    };
  } catch (err) {
    const requestedArea = detectAreaFromMessage(userMessage);
    const primaryArea = isPersonaEnabledForArea(context, requestedArea) ? requestedArea : 'dashboard';
    const primaryAgent = await orchestrateWithAgents(userMessage, context, orchestratorConfig, primaryArea);
    const suggestedAgents = getSuggestedAgents(primaryArea, context);
    const synthesis = await synthesize(orchName, primaryAgent, userMessage, context);
    const message = err instanceof Error ? err.message : '';
    const isInterrupted = message.startsWith('INTERRUPTED:');
    if (isInterrupted) {
      createApproval(threadId, primaryArea, message.replace('INTERRUPTED:', ''));
    }
    appendEvent({
      threadId,
      type: isInterrupted ? 'interrupt' : 'system',
      area: primaryArea,
      payload: { error: message, interrupted: isInterrupted }
    });
    return {
      orchestratorName: orchName,
      orchestratorEmoji: orchEmoji,
      primaryAgent,
      synthesis,
      suggestedAgents,
      mood: determineMood(context, primaryAgent),
      nextSteps: consolidateNextSteps(primaryAgent),
      graph: {
        threadId,
        area: primaryArea,
        events: [`fallback:${isInterrupted ? 'interrupted' : 'error'}`],
        checkpointStatus: isInterrupted ? 'interrupted' : 'completed'
      },
      interrupted: isInterrupted ? { reason: message.replace('INTERRUPTED:', '') } : undefined
    };
  }
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
        model: pickModel('synthesis', primaryAgent.area),
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
        model: pickModel('synthesis', 'dashboard'),
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

function isPersonaEnabledForArea(context: UserContext, area: LifeArea): boolean {
  const personas = context.profile?.aiPersonalization?.personas || [];
  const persona = personas.find((p) => p.area === area);
  if (!persona) return true;
  return PERSONA_AREA_MAP[persona.personaId] === area && persona.enabled;
}
