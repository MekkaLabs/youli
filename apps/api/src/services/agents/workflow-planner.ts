import { LifeArea, detectAreaFromMessage } from './agent-definitions';
import { AgentResponse, orchestrateWithAgents, UserContext } from './agent-executor';
import { OrchestratorConfig } from './agent-definitions';

export interface WorkflowStep {
  id: string;
  area: LifeArea;
  agentName: string;
  reason: string;
  dependsOn?: string;
}

export interface GeneratedWorkflow {
  id: string;
  userRequest: string;
  isCrossArea: boolean;
  steps: WorkflowStep[];
  estimatedTurns: number;
  createdAt: string;
}

interface HaikuPlanResult {
  isCrossArea: boolean;
  areas: string[];
  sequence: Array<{ area: string; reason: string }>;
}

const AREA_AGENT_NAMES: Record<string, string> = {
  financeiro: 'Adam',
  calendario: 'Newton',
  fitness: 'Hipocrates',
  dashboard: 'Youli',
  tarefas: 'Franklin',
  habitos: 'Aristoteles',
  metas: 'Alexandre',
  insights: 'Socrates',
  foco: 'Hermes',
  perfil: 'Youli',
};

const VALID_AREAS: LifeArea[] = [
  'financeiro', 'calendario', 'fitness', 'dashboard',
  'tarefas', 'habitos', 'metas', 'insights', 'foco', 'perfil',
];

function isValidArea(area: string): area is LifeArea {
  return VALID_AREAS.includes(area as LifeArea);
}

function buildSingleAreaWorkflow(userMessage: string, area: LifeArea): GeneratedWorkflow {
  return {
    id: `wf_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    userRequest: userMessage,
    isCrossArea: false,
    steps: [
      {
        id: 'step_0',
        area,
        agentName: AREA_AGENT_NAMES[area] ?? 'Youli',
        reason: `Área detectada: ${area}`,
      },
    ],
    estimatedTurns: 1,
    createdAt: new Date().toISOString(),
  };
}

export async function planWorkflow(
  userMessage: string,
  context: UserContext
): Promise<GeneratedWorkflow> {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    const area = detectAreaFromMessage(userMessage);
    return buildSingleAreaWorkflow(userMessage, area);
  }

  const prompt = `Analise o request '${userMessage}'. Quais áreas de vida estão envolvidas? Retorne APENAS JSON válido (sem markdown, sem explicação), no formato: {"isCrossArea": bool, "areas": string[], "sequence": [{"area": string, "reason": string}]}. Áreas disponíveis: financeiro, calendario, fitness, dashboard, tarefas, habitos, metas, insights, foco, perfil.`;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5',
        max_tokens: 512,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!response.ok) {
      const area = detectAreaFromMessage(userMessage);
      return buildSingleAreaWorkflow(userMessage, area);
    }

    const data = await response.json() as { content?: Array<{ type: string; text: string }> };
    const text = data.content?.find((c) => c.type === 'text')?.text?.trim() ?? '';

    let plan: HaikuPlanResult;
    try {
      plan = JSON.parse(text) as HaikuPlanResult;
    } catch {
      const area = detectAreaFromMessage(userMessage);
      return buildSingleAreaWorkflow(userMessage, area);
    }

    const validSequence = (plan.sequence ?? []).filter((s) => isValidArea(s.area));

    if (!plan.isCrossArea || validSequence.length <= 1) {
      const area = validSequence[0]?.area
        ? (validSequence[0].area as LifeArea)
        : detectAreaFromMessage(userMessage);
      return buildSingleAreaWorkflow(userMessage, area);
    }

    const steps: WorkflowStep[] = validSequence.map((s, idx) => ({
      id: `step_${idx}`,
      area: s.area as LifeArea,
      agentName: AREA_AGENT_NAMES[s.area] ?? 'Youli',
      reason: s.reason,
      dependsOn: idx > 0 ? `step_${idx - 1}` : undefined,
    }));

    return {
      id: `wf_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      userRequest: userMessage,
      isCrossArea: true,
      steps,
      estimatedTurns: steps.length,
      createdAt: new Date().toISOString(),
    };
  } catch {
    const area = detectAreaFromMessage(userMessage);
    return buildSingleAreaWorkflow(userMessage, area);
  }
}

export async function executeWorkflow(
  workflow: GeneratedWorkflow,
  context: UserContext,
  orchestratorConfig?: Partial<OrchestratorConfig>
): Promise<AgentResponse[]> {
  const results: AgentResponse[] = [];
  let previousSummary = '';

  for (const step of workflow.steps) {
    const enrichedMessage = previousSummary
      ? `${workflow.userRequest}\n\n[Contexto do step anterior (${results[results.length - 1]?.agentId ?? 'desconhecido'}): ${previousSummary}]`
      : workflow.userRequest;

    const response = await orchestrateWithAgents(
      enrichedMessage,
      context,
      orchestratorConfig,
      step.area
    );

    results.push(response);
    previousSummary = response.message.slice(0, 300);
  }

  return results;
}
