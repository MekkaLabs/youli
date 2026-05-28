/**
 * POST /api/copilot/orchestrate
 * Orquestrador central — roteia para agente especializado e sintetiza
 *
 * Body: { message, context, orchestratorConfig?, mode? }
 * mode: 'chat' (padrão) | 'morning' (briefing completo)
 *
 * Suporta SSE quando Accept: text/event-stream
 * Eventos: start | thinking | response | done | error
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { runOrchestrator, morningBriefing } from '@/services/agents/orchestrator';
import { UserContext } from '@/services/agents/agent-executor';
import { runOrchestratorGraph } from '@/services/agents/langgraph-orchestrator';
import { planWorkflow, executeWorkflow } from '@/services/agents/workflow-planner';
import { parseJsonBody, requireAuth } from '@/lib/http';
import { enforceRateLimit } from '@/lib/rate-limit';
import { readDb } from '@/repositories/local-db';

const OrchestrateSchema = z.object({
  message: z.string().max(8000).default(''),
  context: z.record(z.string(), z.unknown()).default({}),
  orchestratorConfig: z.record(z.string(), z.unknown()).optional(),
  mode: z.enum(['chat', 'morning']).default('chat'),
  threadId: z.string().max(128).optional(),
  allowResume: z.boolean().default(false),
  useWorkflowPlanner: z.boolean().default(false),
});

/**
 * Injeta a identidade e o perfil DO SERVIDOR (autoritativos) no contexto do
 * usuário logado. Garante que os agentes personalizem por usuário mesmo que o
 * cliente envie um contexto incompleto — e impede um cliente de se passar por
 * outro perfil (os campos do servidor sobrescrevem os do cliente).
 */
function enrichContext(userId: string, context: UserContext): UserContext {
  const profile = readDb(userId).profile;
  return {
    ...context,
    userId,
    profile: {
      ...(context.profile ?? {}),
      name: profile.name,
      objectives: profile.objectives,
      lifeAreas: profile.lifeAreas,
      humanDesign: profile.humanDesign,
      aiPersonalization: profile.aiPersonalization,
    },
  };
}

const SSE_HEADERS = {
  'Content-Type': 'text/event-stream',
  'Cache-Control': 'no-cache',
  'Connection': 'keep-alive',
  'X-Accel-Buffering': 'no',
};

function sseEvent(event: string, data: unknown): string {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth();
  if (auth.error) return auth.response;

  // Rate limit: rota cara (chama Claude). 30/min/IP — sob carga normal sobra,
  // sob abuso barra. Eventos SSE não engatilham o limit (1 request = 1 hit).
  const limited = enforceRateLimit(req, 'orchestrate', 30, 60_000);
  if (limited) return limited;

  const acceptHeader = req.headers.get('accept') || '';

  const parsed = await parseJsonBody(req, OrchestrateSchema);
  if (!parsed.ok) return parsed.response;
  const {
    message,
    context: rawContext,
    orchestratorConfig,
    mode,
    threadId,
    allowResume,
    useWorkflowPlanner,
  } = parsed.data;

  // Contexto enriquecido com o perfil autoritativo do usuário logado.
  const context = enrichContext(auth.user.id, rawContext as unknown as UserContext);

  // ── SSE branch ──────────────────────────────────────────────────────────────
  if (acceptHeader.includes('text/event-stream')) {
    if (mode !== 'morning' && !message.trim()) {
      const stream = new ReadableStream({
        start(controller) {
          controller.enqueue(new TextEncoder().encode(sseEvent('error', { error: 'message é obrigatório no modo chat' })));
          controller.close();
        },
      });
      return new Response(stream, { status: 400, headers: SSE_HEADERS });
    }

    const graphThreadId = threadId || `thread_sse_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

    const stream = new ReadableStream({
      async start(controller) {
        const enc = new TextEncoder();
        const emit = (event: string, data: unknown) => {
          controller.enqueue(enc.encode(sseEvent(event, data)));
        };

        const startedAt = Date.now();

        try {
          // 1. Evento imediato de início
          emit('start', {
            area: (orchestratorConfig as any)?.area ?? 'auto',
            agent: (orchestratorConfig as any)?.name ?? 'Youli',
          });

          // 2. Thinking — emitido enquanto o grafo processa
          const thinkingSteps = [
            'Analisando sua mensagem...',
            'Identificando área relevante...',
            'Consultando agente especializado...',
            'Sintetizando resposta...',
          ];

          let stepIdx = 0;
          const thinkingInterval = setInterval(() => {
            if (stepIdx < thinkingSteps.length) {
              emit('thinking', { step: thinkingSteps[stepIdx++] });
            }
          }, 600);

          // 3. Execução real do grafo
          let result: Awaited<ReturnType<typeof runOrchestratorGraph>>;
          try {
            result = await runOrchestratorGraph({
              threadId: graphThreadId,
              userMessage: message,
              context: context as UserContext,
              orchestratorConfig,
              allowResume,
            });
          } finally {
            clearInterval(thinkingInterval);
          }

          // 4. Evento de resposta completa
          emit('response', {
            message: result.primaryAgent?.message ?? result.synthesis ?? '',
            insights: result.primaryAgent?.insights ?? [],
            actions: result.primaryAgent?.actions ?? [],
            synthesis: result.synthesis ?? '',
            primaryAgent: result.primaryAgent,
            suggestedAgents: result.suggestedAgents ?? [],
            nextSteps: result.nextSteps ?? [],
            graph: {
              threadId: result.threadId,
              area: result.primaryArea,
              events: result.events ?? [],
              checkpointStatus: 'completed',
            },
          });

          // 5. Evento done com métricas
          emit('done', {
            selfEvalScore: result.selfEvalScore ?? 75,
            durationMs: Date.now() - startedAt,
          });
        } catch (err) {
          console.error('[/api/copilot/orchestrate SSE] Error:', err);
          emit('error', { error: err instanceof Error ? err.message : 'Erro interno no orquestrador' });
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, { headers: SSE_HEADERS });
  }

  // ── JSON branch (comportamento original inalterado) ─────────────────────────
  try {
    let response;

    if (mode === 'morning') {
      // Briefing matinal: consulta múltiplos agentes
      response = await morningBriefing(context, orchestratorConfig);
    } else {
      // Chat normal: roteia para o agente certo
      if (!message.trim()) {
        return NextResponse.json({ error: 'message é obrigatório no modo chat' }, { status: 400 });
      }

      if (useWorkflowPlanner) {
        const workflow = await planWorkflow(message, context as UserContext);
        if (workflow.isCrossArea && workflow.steps.length > 1) {
          const workflowResponses = await executeWorkflow(workflow, context as UserContext, orchestratorConfig);
          return NextResponse.json({
            workflow,
            responses: workflowResponses,
            isCrossArea: true,
          });
        }
      }

      response = await runOrchestrator(message, context, orchestratorConfig, {
        threadId,
        allowResume
      });
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
