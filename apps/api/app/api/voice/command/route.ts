/**
 * POST /api/voice/command
 *
 * Recebe texto transcrito (do Handy no desktop ou expo-speech no mobile)
 * Detecta intenção → executa ação → retorna resposta estruturada
 *
 * Body: { text: string; profileId?: string; context?: object }
 * Response: { intent: VoiceIntent; action: string; result: object; agentResponse?: string }
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { parseVoiceIntent, VoiceIntent } from '@/services/voice/voice-intent-parser';
import { parseJsonBody, requireAuth } from '@/lib/http';
import { enforceRateLimit } from '@/lib/rate-limit';

const VoiceCommandSchema = z.object({
  text: z.string().trim().min(2, 'text precisa de pelo menos 2 caracteres').max(4000),
  context: z.record(z.string(), z.unknown()).default({}),
});

// Tipos de ação executável
type ActionResult = {
  success: boolean;
  action: string;
  data?: Record<string, unknown>;
  message: string;
  redirectTo?: string; // rota do app mobile para navegar
};

// ─── Executor de ações ─────────────────────────────────────────────────────

async function executeIntent(
  intent: VoiceIntent,
  profileId: string,
  context: Record<string, unknown>,
  baseUrl: string,
  authHeaders: Record<string, string> = {},
): Promise<ActionResult> {
  // Auth do caller é propagada para os fetches internos (senão middleware/requireAuth retornam 401).
  const headers: Record<string, string> = { 'Content-Type': 'application/json', ...authHeaders };

  switch (intent.type) {

    // ── Briefing matinal ─────────────────────────────────────────────────
    case 'morning_briefing': {
      const res = await fetch(`${baseUrl}/api/copilot/orchestrate`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ message: intent.rawText, profileId, context, mode: 'morning' }),
      });
      const data = await res.json();
      return {
        success: true,
        action: 'morning_briefing',
        data,
        message: '☀️ Seu briefing matinal está pronto!',
        redirectTo: '/(tabs)/dashboard',
      };
    }

    // ── Criar tarefa ─────────────────────────────────────────────────────
    case 'create_task': {
      const { title, priority } = intent.entities;
      if (!title) return { success: false, action: 'create_task', message: 'Não entendi o título da tarefa.' };

      // Chama agente Franklin para enriquecer antes de salvar
      const agentRes = await fetch(`${baseUrl}/api/copilot/agent/tarefas`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          message: `Por favor, adicione a tarefa: "${title}" com prioridade ${priority ?? 'normal'}`,
          profileId,
          context,
        }),
      });
      const agentData = await agentRes.json();

      return {
        success: true,
        action: 'create_task',
        data: { title, priority, agentSuggestion: agentData?.message },
        message: `✅ Franklin registrou: "${title}"`,
        redirectTo: '/(tabs)/tarefas',
      };
    }

    // ── Criar hábito ─────────────────────────────────────────────────────
    case 'create_habit': {
      const { title } = intent.entities;
      if (!title) return { success: false, action: 'create_habit', message: 'Não entendi o nome do hábito.' };

      const agentRes = await fetch(`${baseUrl}/api/copilot/agent/habitos`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          message: `Crie o hábito: "${title}"`,
          profileId,
          context,
        }),
      });
      const agentData = await agentRes.json();

      return {
        success: true,
        action: 'create_habit',
        data: { title, agentSuggestion: agentData?.message },
        message: `🏛️ Aristóteles registrou o hábito: "${title}"`,
        redirectTo: '/(tabs)/habitos',
      };
    }

    // ── Criar meta ───────────────────────────────────────────────────────
    case 'create_goal': {
      const { title } = intent.entities;
      if (!title) return { success: false, action: 'create_goal', message: 'Não entendi o nome da meta.' };

      const agentRes = await fetch(`${baseUrl}/api/copilot/agent/metas`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          message: `Defina a meta: "${title}"`,
          profileId,
          context,
        }),
      });
      const agentData = await agentRes.json();

      return {
        success: true,
        action: 'create_goal',
        data: { title, agentSuggestion: agentData?.message },
        message: `⚔️ Alexandre registrou sua meta: "${title}"`,
        redirectTo: '/(tabs)/metas',
      };
    }

    // ── Registrar gasto ──────────────────────────────────────────────────
    case 'log_expense': {
      const { title, value, category } = intent.entities;
      return {
        success: true,
        action: 'log_expense',
        data: { title, value, category },
        message: value
          ? `💰 Adam registrou gasto de R$ ${value.toFixed(2)} em ${category}`
          : `💰 Adam registrou: "${title}"`,
        redirectTo: '/(tabs)/financeiro',
      };
    }

    // ── Registrar receita ────────────────────────────────────────────────
    case 'log_income': {
      const { title, value } = intent.entities;
      return {
        success: true,
        action: 'log_income',
        data: { title, value, category: 'receita' },
        message: value
          ? `💰 Adam registrou entrada de R$ ${value.toFixed(2)}`
          : `💰 Adam registrou receita: "${title}"`,
        redirectTo: '/(tabs)/financeiro',
      };
    }

    // ── Registrar treino ─────────────────────────────────────────────────
    case 'log_workout': {
      const { title, duration } = intent.entities;
      return {
        success: true,
        action: 'log_workout',
        data: { title, duration },
        message: duration
          ? `🏃 Hipócrates registrou: ${title} por ${duration}`
          : `🏃 Hipócrates registrou treino: "${title}"`,
        redirectTo: '/(tabs)/fitness',
      };
    }

    // ── Simulação de vida ────────────────────────────────────────────────
    case 'run_simulation': {
      const { horizon, whatIf } = intent.entities;
      const body = {
        profileId,
        horizonDays: horizon ?? 90,
        scenarioType: whatIf ? 'what_if' : 'current_trajectory',
        whatIfChanges: whatIf ? [{ area: 'geral', change: whatIf, impact: 'positivo' }] : undefined,
        context,
      };
      const simRes = await fetch(`${baseUrl}/api/simulation/run`, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
      });
      const simData = await simRes.json().catch(() => ({}));
      return {
        success: true,
        action: 'run_simulation',
        data: simData,
        message: `🔮 Simulação de ${horizon ?? 90} dias concluída!`,
        redirectTo: '/(tabs)/simular',
      };
    }

    // ── Consulta de status / pergunta a agente ───────────────────────────
    case 'check_status':
    case 'ask_agent':
    case 'unknown':
    default: {
      // Rota: agente específico ou orquestrador
      const endpoint = intent.routeToOrchestrator
        ? `${baseUrl}/api/copilot/orchestrate`
        : `${baseUrl}/api/copilot/agent/${intent.area}`;

      const res = await fetch(endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          message: intent.rawText,
          profileId,
          context,
          mode: 'chat',
        }),
      });
      const data = await res.json();
      return {
        success: true,
        action: 'agent_response',
        data,
        message: data?.message ?? 'Resposta pronta!',
      };
    }
  }
}

// ─── Handler principal ────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  // P0: auth obrigatória. profileId vem SEMPRE do servidor — nunca do body
  // (evita impersonação por usuário logado).
  const auth = await requireAuth();
  if (auth.error) return auth.response;

  // Rate limit: voz pode encadear chamadas internas (orchestrate, summaries).
  const limited = enforceRateLimit(req, 'voice-command', 20, 60_000);
  if (limited) return limited;

  const parsed = await parseJsonBody(req, VoiceCommandSchema);
  if (!parsed.ok) return parsed.response;
  const { text, context } = parsed.data;

  try {
    const profileId = auth.user.id;

    // Parse da intenção
    const intent = parseVoiceIntent(text);

    // Monta base URL para chamadas internas
    const baseUrl = req.nextUrl.origin;

    // Propaga auth do caller para os fetches internos.
    const authHeaders: Record<string, string> = {};
    const authz = req.headers.get('authorization');
    const cookie = req.headers.get('cookie');
    if (authz) authHeaders['Authorization'] = authz;
    if (cookie) authHeaders['Cookie'] = cookie;

    // Executa ação
    const result = await executeIntent(intent, profileId, context, baseUrl, authHeaders);

    return NextResponse.json({
      intent,
      ...result,
      timestamp: new Date().toISOString(),
    });

  } catch (err) {
    console.error('[voice/command]', err);
    return NextResponse.json({ error: 'Erro interno no processamento de voz' }, { status: 500 });
  }
}

// ─── GET: retorna o prompt Handy pré-formatado ────────────────────────────
export async function GET() {
  const { HANDY_POST_PROCESSING_PROMPT } = await import('@/services/voice/voice-intent-parser');
  return NextResponse.json({
    handyPrompt: HANDY_POST_PROCESSING_PROMPT,
    supportedIntents: [
      'create_task', 'create_habit', 'create_goal',
      'log_workout', 'log_expense', 'log_income',
      'ask_agent', 'morning_briefing', 'run_simulation',
      'check_status',
    ],
    agentTriggers: {
      franklin: 'tarefas',
      aristóteles: 'habitos',
      alexandre: 'metas',
      adam: 'financeiro',
      hipócrates: 'fitness',
      newton: 'calendario',
      sócrates: 'insights',
      tesla: 'foco',
      'marco aurélio': 'perfil',
      leonardo: 'dashboard',
    },
  });
}
