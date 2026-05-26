/**
 * POST /api/copilot/agent/[area]
 * Consulta um agente especializado diretamente por área de vida
 *
 * Body: { message, context, orchestratorConfig? }
 * Returns: AgentResponse
 */

import { NextRequest, NextResponse } from 'next/server';
import { executeAgent, UserContext } from '@/services/agents/agent-executor';
import { LifeArea } from '@/services/agents/agent-definitions';
import { applyOutputGuardrails } from '@/services/agents/guardrails';
import { requireAuth } from '@/lib/http';
import { readDb } from '@/repositories/local-db';

const VALID_AREAS: LifeArea[] = [
  'dashboard', 'tarefas', 'habitos', 'metas', 'financeiro',
  'fitness', 'calendario', 'insights', 'foco', 'perfil',
];

export async function POST(
  req: NextRequest,
  routeContext: { params: Promise<{ area: string }> }
) {
  // P0: agente personaliza por usuário logado — identidade vem do servidor.
  const auth = await requireAuth();
  if (auth.error) return auth.response;

  try {
    const params = await routeContext.params;
    const area = params.area as LifeArea;

    if (!VALID_AREAS.includes(area)) {
      return NextResponse.json(
        { error: `Área inválida. Use: ${VALID_AREAS.join(', ')}` },
        { status: 400 }
      );
    }

    const body = await req.json();
    const { message, context: rawContext = {}, orchestratorConfig } = body as {
      message: string;
      context: UserContext;
      orchestratorConfig?: { name?: string; emoji?: string };
    };

    if (!message?.trim()) {
      return NextResponse.json({ error: 'message é obrigatório' }, { status: 400 });
    }

    // Identidade do servidor sobrescreve campos sensíveis vindos do cliente.
    const profile = readDb(auth.user.id).profile;
    const context: UserContext = {
      ...rawContext,
      userId: auth.user.id,
      profile: {
        ...(rawContext.profile ?? {}),
        name: profile.name,
        objectives: profile.objectives,
        lifeAreas: profile.lifeAreas,
        humanDesign: profile.humanDesign,
        aiPersonalization: profile.aiPersonalization,
      },
    };

    const response = await executeAgent(area, message, context, orchestratorConfig);
    const safeResponse = applyOutputGuardrails(area, response);

    return NextResponse.json(safeResponse);
  } catch (err) {
    console.error('[/api/copilot/agent] Error:', err);
    return NextResponse.json(
      { error: 'Erro interno ao consultar agente' },
      { status: 500 }
    );
  }
}

// GET: retorna info do agente da área sem executar
export async function GET(
  _req: NextRequest,
  routeContext: { params: Promise<{ area: string }> }
) {
  const { getAgentForArea, AGENT_DEFINITIONS } = await import('@/services/agents/agent-definitions');
  const params = await routeContext.params;
  const area = params.area as LifeArea;

  const agent = AGENT_DEFINITIONS[area];
  if (!agent) {
    return NextResponse.json({ error: 'Área não encontrada' }, { status: 404 });
  }

  // Retorna metadata sem o systemPrompt completo
  const { systemPrompt: _, ...publicInfo } = agent;
  return NextResponse.json(publicInfo);
}
