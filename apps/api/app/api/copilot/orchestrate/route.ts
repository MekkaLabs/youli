/**
 * POST /api/copilot/orchestrate
 * Orquestrador central — roteia para agente especializado e sintetiza
 *
 * Body: { message, context, orchestratorConfig?, mode? }
 * mode: 'chat' (padrão) | 'morning' (briefing completo)
 */

import { NextRequest, NextResponse } from 'next/server';
import { runOrchestrator, morningBriefing } from '@/services/agents/orchestrator';
import { UserContext } from '@/services/agents/agent-executor';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      message = '',
      context = {} as UserContext,
      orchestratorConfig,
      mode = 'chat',
    } = body;

    let response;

    if (mode === 'morning') {
      // Briefing matinal: consulta múltiplos agentes
      response = await morningBriefing(context, orchestratorConfig);
    } else {
      // Chat normal: roteia para o agente certo
      if (!message.trim()) {
        return NextResponse.json({ error: 'message é obrigatório no modo chat' }, { status: 400 });
      }
      response = await runOrchestrator(message, context, orchestratorConfig);
    }

    return NextResponse.json(response);
  } catch (err) {
    console.error('[/api/copilot/orchestrate] Error:', err);
    return NextResponse.json(
      { error: 'Erro interno no orquestrador' },
      { status: 500 }
    );
  }
}
