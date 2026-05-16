import {
  DEFAULT_ORCHESTRATOR,
  detectAreaFromMessage,
  LifeArea,
  OrchestratorConfig,
  PERSONA_AREA_MAP,
} from './agent-definitions';
import {
  AgentResponse,
  orchestrateWithAgents,
  UserContext,
} from './agent-executor';
import {
  OrchestratorGraphCheckpoint,
  getGraphCheckpoint,
  putGraphCheckpoint,
} from './orchestrator-graph-store';
import { getWorkflowForArea } from './workflow-catalog';
import { saveTrace } from './orchestrator-observability';
import { applyOutputGuardrails, selfEvaluate } from './guardrails';
import { evaluateConditionalTask } from './conditional-tasks';
import { executeKernelFunction } from '../kernel/plugin-executor';
import { getRuntimeConfig } from './runtime-config';
import { saveContextSnapshot } from './context-snapshots';
import { getSOPForArea } from './sop-registry';
import { getContextualPatterns, updatePatternsAfterInteraction } from './skill-manager';
import { compressContext, shouldCompress } from '../kernel/context-compressor';
import { recordInteraction } from './agent-leaderboard';

export interface GraphOrchestratorResult {
  threadId: string;
  primaryArea: LifeArea;
  primaryAgent: AgentResponse;
  handoffAgent?: AgentResponse;
  handoffArea?: LifeArea;
  handoffReason?: string;
  suggestedAgents: Array<{ area: LifeArea; name: string; emoji: string; reason: string }>;
  synthesis: string;
  mood: 'encouraging' | 'alert' | 'celebratory' | 'analytical';
  nextSteps: string[];
  events: string[];
  workflowVersion: number;
  selfEvalScore?: number;
}

interface RunGraphInput {
  threadId: string;
  userMessage: string;
  context: UserContext;
  orchestratorConfig?: Partial<OrchestratorConfig>;
  forceArea?: LifeArea;
  allowResume?: boolean;
}

function nowIso() {
  return new Date().toISOString();
}

function pushEvent(events: string[], event: string) {
  events.push(`${new Date().toISOString()} ${event}`);
}

function shouldInterrupt(message: string): string | null {
  const m = message.toLowerCase();
  if (m.includes('transfer') || m.includes('transferir') || m.includes('pix')) {
    return 'Operacao financeira sensivel detectada. Confirme antes de executar.';
  }
  if (m.includes('deletar') || m.includes('apagar') || m.includes('excluir')) {
    return 'Acao destrutiva detectada. Confirme antes de executar.';
  }
  return null;
}

function contextScore(area: LifeArea, context: UserContext): number {
  const tasks = context.tasks ?? [];
  const goals = context.goals ?? [];
  const habits = context.habits ?? [];
  const txs = context.finances?.recentTransactions ?? [];
  const events = context.calendar ?? [];

  if (area === 'tarefas') return tasks.filter((t) => t.status !== 'done').length * 2 + tasks.filter((t) => t.priority >= 4).length;
  if (area === 'metas') return goals.filter((g) => g.status !== 'done').length * 2 + goals.filter((g) => g.progress < 40).length;
  if (area === 'habitos') return habits.length ? habits.filter((h) => h.streak < 3).length * 2 : 0;
  if (area === 'financeiro') return txs.length + Math.max(0, (context.finances?.expenses ?? 0) - (context.finances?.income ?? 0) > 0 ? 4 : 0);
  if (area === 'fitness') return (context.fitness?.weeklyActivities ?? 0) < (context.fitness?.goalWeeklyActivities ?? 0) ? 3 : 1;
  if (area === 'calendario') return events.length;
  if (area === 'insights') return (context.insights ?? []).length;
  if (area === 'foco') return tasks.filter((t) => t.status === 'doing').length;
  if (area === 'perfil') return (context.profile?.objectives?.length ?? 0) + (context.profile?.lifeAreas?.length ?? 0);
  return 1;
}

function selectAreaByContext(inputArea: LifeArea, context: UserContext): LifeArea {
  const workflow = getWorkflowForArea(inputArea);
  if (!workflow.enabled) return inputArea;
  const scored = workflow.selector.candidates
    .map((area) => ({ area, score: contextScore(area, context) }))
    .sort((a, b) => b.score - a.score);
  const top = scored[0];
  if (!top || top.score <= 0) return inputArea;
  return top.area;
}

function isPersonaEnabledForArea(context: UserContext, area: LifeArea): boolean {
  const personas = context.profile?.aiPersonalization?.personas || [];
  const persona = personas.find((p) => p.area === area);
  if (!persona) return true;
  return PERSONA_AREA_MAP[persona.personaId] === area && persona.enabled;
}

function determineMood(context: UserContext, agent: AgentResponse): GraphOrchestratorResult['mood'] {
  if (agent.urgency === 'high') return 'alert';
  const hasGoodHabits = context.habits?.some((h) => h.streak >= 7);
  const hasGoodGoals = context.goals?.some((g) => g.progress >= 80);
  if (hasGoodHabits || hasGoodGoals) return 'celebratory';
  if (agent.urgency === 'low') return 'analytical';
  return 'encouraging';
}

function buildSuggestedAgents(primaryArea: LifeArea): GraphOrchestratorResult['suggestedAgents'] {
  const map: Array<{ area: LifeArea; name: string; emoji: string; reason: string }> = [
    { area: 'tarefas', name: 'Franklin', emoji: '⚡', reason: 'Converter estrategia em execucao pratica' },
    { area: 'habitos', name: 'Aristoteles', emoji: '🏛️', reason: 'Sustentar consistencia diaria' },
    { area: 'metas', name: 'Alexandre', emoji: '⚔️', reason: 'Acelerar progresso de metas' },
    { area: 'financeiro', name: 'Adam', emoji: '💰', reason: 'Melhorar decisao financeira' },
    { area: 'fitness', name: 'Hipocrates', emoji: '⚕️', reason: 'Equilibrar energia e performance' },
    { area: 'calendario', name: 'Newton', emoji: '📅', reason: 'Organizar alocacao do tempo' },
    { area: 'insights', name: 'Socrates', emoji: '🦉', reason: 'Gerar reflexao e clareza' },
  ];
  return map.filter((a) => a.area !== primaryArea).slice(0, 3);
}

function buildSynthesis(orchestratorName: string, primaryAgent: AgentResponse): string {
  return `${orchestratorName}: ${primaryAgent.message}`;
}

function buildNextSteps(primaryAgent: AgentResponse): string[] {
  return [...primaryAgent.actions, ...primaryAgent.insights.slice(0, 1)].slice(0, 4);
}

function qualityScores(agent: AgentResponse, context: UserContext) {
  const actionable = agent.actions.length ? Math.min(1, agent.actions.length / 3) : 0;
  const consistency = agent.message.length > 30 && agent.insights.length > 0 ? 0.9 : 0.5;
  const ctxHints = (context.memoryContext?.length ?? 0) + (context.tasks?.length ?? 0) + (context.goals?.length ?? 0);
  const retention = Math.min(1, ctxHints > 0 ? 0.85 : 0.45);
  return {
    actionableScore: Number(actionable.toFixed(3)),
    consistencyScore: Number(consistency.toFixed(3)),
    contextRetentionScore: Number(retention.toFixed(3)),
  };
}

function shouldHandoff(
  area: LifeArea,
  primaryAgent: AgentResponse
): { toArea: LifeArea; reason: string } | null {
  const wf = getWorkflowForArea(area);
  if (!wf.handoffs.length) return null;
  const message = `${primaryAgent.message} ${primaryAgent.insights.join(' ')}`.toLowerCase();
  const byKeyword: Array<{ pattern: RegExp; target: LifeArea; reason: string }> = [
    { pattern: /(meta|objetivo|prazo)/, target: 'metas', reason: 'impacto direto em metas' },
    { pattern: /(agenda|hor[aá]rio|evento)/, target: 'calendario', reason: 'necessita ajuste de agenda' },
    { pattern: /(energia|sono|treino|sa[úu]de)/, target: 'fitness', reason: 'fator de energia/saude detectado' },
    { pattern: /(gasto|receita|dinheiro|finance)/, target: 'financeiro', reason: 'sinal financeiro relevante' },
    { pattern: /(h[aá]bito|consist)/, target: 'habitos', reason: 'consistencia comportamental necessaria' },
  ];
  const matched = byKeyword.find((x) => x.pattern.test(message) && wf.handoffs.includes(x.target));
  if (matched) return { toArea: matched.target, reason: matched.reason };
  if (primaryAgent.urgency === 'high' && wf.handoffs.includes('insights')) {
    return { toArea: 'insights', reason: 'urgencia alta exige leitura cross-area' };
  }
  return null;
}

function shouldTerminate(area: LifeArea, primary: AgentResponse, secondary?: AgentResponse): { stop: boolean; reason: string } {
  const wf = getWorkflowForArea(area);
  if (wf.termination.stopOnHighUrgency && primary.urgency === 'high') {
    return { stop: true, reason: 'stop_on_high_urgency' };
  }
  const actionCount = (primary.actions?.length ?? 0) + (secondary?.actions?.length ?? 0);
  if (actionCount >= wf.termination.maxAgentActions) {
    return { stop: true, reason: 'max_agent_actions' };
  }
  return { stop: false, reason: 'continue' };
}

function checkpointBase(
  input: RunGraphInput,
  nodeId: string,
  status: OrchestratorGraphCheckpoint['status'],
  events: string[],
  area: LifeArea,
  interruptReason?: string
): OrchestratorGraphCheckpoint {
  return {
    threadId: input.threadId,
    nodeId,
    status,
    message: input.userMessage,
    area,
    context: input.context,
    createdAt: nowIso(),
    updatedAt: nowIso(),
    interruptReason,
    events,
  };
}

interface SOPContext {
  [stepId: string]: AgentResponse;
}

async function runReActObserve(
  area: LifeArea,
  context: UserContext,
  userMessage: string,
  maxIterations: number = 2
): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return userMessage;

  const tasks = context.tasks ?? [];
  const habits = context.habits ?? [];
  const goals = context.goals ?? [];
  const balance = context.finances?.balance ?? 0;

  let enriched = userMessage;

  for (let i = 0; i < maxIterations; i++) {
    const prompt = `Analisando o request '${enriched}' para a área ${area}, quais dados do contexto são MAIS relevantes? Contexto disponível: tasks=${tasks.length}, habits=${habits.length}, goals=${goals.length}, finances=${balance}. Retorne 1-2 frases de contexto relevante para enriquecer a resposta.`;

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
          max_tokens: 256,
          messages: [{ role: 'user', content: prompt }],
        }),
      });

      if (!response.ok) break;

      const data = await response.json() as { content?: Array<{ type: string; text: string }> };
      const observation = data.content?.find((c) => c.type === 'text')?.text?.trim();
      if (observation) {
        enriched = `${enriched}\n\n[Contexto ReAct observado: ${observation}]`;
      }
    } catch {
      break;
    }
  }

  return enriched;
}

export async function runSOPForArea(
  area: LifeArea,
  userMessage: string,
  context: UserContext,
  orchestratorConfig?: Partial<OrchestratorConfig>
): Promise<AgentResponse> {
  const sop = getSOPForArea(area);
  const sopContext: SOPContext = {};
  let lastResponse: AgentResponse | null = null;

  for (const step of sop.steps) {
    const previousSummary =
      lastResponse !== null
        ? `\n\n[Resultado do step anterior — ${Object.keys(sopContext).at(-1) ?? ''}]: ${lastResponse.message}`
        : '';

    const enrichedMessage = `${userMessage}${previousSummary}\n\n[SOP Step: ${step.name}] ${step.promptFocus}`;

    const stepResponse = await orchestrateWithAgents(
      enrichedMessage,
      context,
      orchestratorConfig,
      area
    );

    const guarded = applyOutputGuardrails(area, stepResponse);
    sopContext[step.id] = guarded;
    lastResponse = guarded;
  }

  if (lastResponse === null) {
    // Fallback: run the agent directly if the SOP had no steps
    return orchestrateWithAgents(userMessage, context, orchestratorConfig, area);
  }

  return lastResponse;
}

export async function runOrchestratorGraph(input: RunGraphInput): Promise<GraphOrchestratorResult> {
  const startedAt = Date.now();
  const traceId = `trace_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const handoffSpans: Array<{ from: LifeArea; to: LifeArea; reason: string }> = [];
  const events: string[] = [];
  const config = { ...DEFAULT_ORCHESTRATOR, ...input.orchestratorConfig };
  const runtimeConfig = getRuntimeConfig();

  pushEvent(events, 'start');
  const requestedArea = input.forceArea || detectAreaFromMessage(input.userMessage);
  const selectedArea = selectAreaByContext(requestedArea, input.context);
  const primaryArea = isPersonaEnabledForArea(input.context, selectedArea) ? selectedArea : 'dashboard';
  pushEvent(events, `route_area:${requestedArea}->${primaryArea}`);

  const interruptReason = shouldInterrupt(input.userMessage);
  if (interruptReason) {
    pushEvent(events, `interrupt:${interruptReason}`);
    putGraphCheckpoint(
      checkpointBase(input, 'guardrails', 'interrupted', events, primaryArea, interruptReason)
    );
    saveTrace({
      traceId,
      threadId: input.threadId,
      area: primaryArea,
      startedAt: new Date(startedAt).toISOString(),
      endedAt: new Date().toISOString(),
      durationMs: Date.now() - startedAt,
      status: 'interrupted',
      nodes: ['start', 'selector', 'guardrails'],
      handoffs: [],
      interruptedReason: interruptReason,
    });
    throw new Error(`INTERRUPTED:${interruptReason}`);
  }

  try {
    saveContextSnapshot(input.threadId, 'start', input.context);
    const areaTools = runtimeConfig.toolBundlesByArea[primaryArea] || [];
    for (const functionId of areaTools) {
      const pluginResult = executeKernelFunction(
        functionId,
        {},
        {
          threadId: input.threadId,
          area: primaryArea,
          source: 'orchestrator',
          userId: input.context.profile?.name,
        },
        { estimatedCost: 0.01, risk: 'low', isLongTask: false }
      );
      pushEvent(events, `plugin_enrichment:${functionId}:${pluginResult.ok ? 'ok' : `err:${pluginResult.error}`}`);
    }

    putGraphCheckpoint(
      checkpointBase(input, 'execute_specialist', 'running', events, primaryArea)
    );

    const userId = input.context.profile?.name ?? 'default';
    let effectiveContext = input.context;
    let effectiveUserMessage = input.userMessage;

    // Context Compression (Sprint A — Aider)
    if (runtimeConfig.enableContextCompression && shouldCompress(effectiveContext as Record<string, unknown>, runtimeConfig.contextBudgetTokens)) {
      const comprResult = compressContext(effectiveContext as Record<string, unknown>, {
        budgetTokens: runtimeConfig.contextBudgetTokens,
        area: primaryArea,
        preserveRecent: 5,
      });
      effectiveContext = comprResult.compressed as UserContext;
      pushEvent(events, `context_compression:ratio=${comprResult.compressionRatio.toFixed(2)}:dropped=${comprResult.droppedKeys.length}`);
    }

    if (runtimeConfig.enableSkillManager) {
      const patterns = getContextualPatterns(userId, primaryArea);
      if (patterns.length > 0) {
        effectiveUserMessage = `${effectiveUserMessage}\n\n[Padrões aprendidos do usuário: ${patterns.join('; ')}]`;
        pushEvent(events, `skill_manager:injected_patterns:${patterns.length}`);
      }
    }

    if (runtimeConfig.enableReAct) {
      pushEvent(events, 'react_loop:start');
      effectiveUserMessage = await runReActObserve(
        primaryArea,
        effectiveContext,
        input.userMessage,
        runtimeConfig.reactMaxIterations
      );
      pushEvent(events, `react_loop:done:enriched=${effectiveUserMessage !== input.userMessage}`);
    }

    // Goal Checkpoint detection (Sprint H — SWE-CI)
    if (runtimeConfig.enableGoalCheckpoint) {
      try {
        const { detectInactiveGoals } = await import('./goal-checkpoint');
        const inactiveGoals = detectInactiveGoals(userId, runtimeConfig.goalInactivityDays);
        if (inactiveGoals.length > 0) {
          const goalTitles = inactiveGoals.map((c) => c.goalTitle).join(', ');
          pushEvent(events, `goal_checkpoint:inactive_goals:${inactiveGoals.length}`);
          effectiveUserMessage = `${effectiveUserMessage}\n\n[⚠️ Checkpoint: metas paradas há ${runtimeConfig.goalInactivityDays}+ dias: ${goalTitles}. Incluir plano de retomada.]`;
        }
      } catch { /* non-blocking */ }
    }

    // Maintainability Score injection (Sprint H — SWE-CI)
    if (runtimeConfig.enableMaintainabilityScore) {
      try {
        const { scoreMaintainability } = await import('./maintainability-scorer');
        const maintainability = scoreMaintainability(effectiveContext as Record<string, unknown>);
        pushEvent(events, `maintainability:score=${maintainability.score}:verdict=${maintainability.verdict}`);
        if (maintainability.verdict === 'high_risk') {
          effectiveUserMessage = `${effectiveUserMessage}\n\n[🔴 Sustentabilidade em risco (${maintainability.score}/100). Priorizar recomendações de alívio de carga.]`;
        }
      } catch { /* non-blocking */ }
    }

    let primaryAgent: AgentResponse;
    if (runtimeConfig.enableSOP) {
      pushEvent(events, `sop_start:${primaryArea}`);
      primaryAgent = await runSOPForArea(
        primaryArea,
        effectiveUserMessage,
        input.context,
        input.orchestratorConfig
      );
      pushEvent(events, `sop_done:${primaryAgent.agentId}`);
    } else {
      primaryAgent = await orchestrateWithAgents(
        effectiveUserMessage,
        input.context,
        input.orchestratorConfig,
        primaryArea
      );
      primaryAgent = applyOutputGuardrails(primaryArea, primaryAgent);
    }
    pushEvent(events, `specialist_done:${primaryAgent.agentId}`);

    // Self-evaluation: score the primary response; retry once if below threshold
    let selfEvalResult = await selfEvaluate(effectiveUserMessage, primaryAgent);
    pushEvent(events, `self_eval:score=${selfEvalResult.score}:passed=${selfEvalResult.passed}`);

    if (!selfEvalResult.passed) {
      pushEvent(events, 'self_eval:retry');
      const retryAgent = await orchestrateWithAgents(
        effectiveUserMessage,
        input.context,
        input.orchestratorConfig,
        primaryArea
      );
      const retryGuarded = applyOutputGuardrails(primaryArea, retryAgent);
      const retryEval = await selfEvaluate(input.userMessage, retryGuarded);
      pushEvent(events, `self_eval_retry:score=${retryEval.score}:passed=${retryEval.passed}`);
      // Accept retry result if it scored higher than the original
      if (retryEval.score > selfEvalResult.score) {
        primaryAgent = retryGuarded;
        selfEvalResult = retryEval;
      }
    }
    // Failure Attribution (Sprint G — SWE-CI): classify why underperforming goals stalled
    if (runtimeConfig.enableFailureAttribution && !selfEvalResult.passed) {
      try {
        const { attributeFailure } = await import('./failure-attribution');
        const lowGoals = (input.context.goals ?? []).filter(
          (g: { progress?: number; status?: string }) => (g.progress ?? 0) < 30 && g.status === 'active'
        );
        if (lowGoals.length > 0) {
          const attribution = await attributeFailure(
            input.context as Record<string, unknown>,
            lowGoals[0] as Record<string, unknown>,
            primaryArea
          );
          pushEvent(events, `failure_attribution:causes=${attribution.causes.join(',')}`);
        }
      } catch { /* non-blocking */ }
    }

    let handoffAgent: AgentResponse | undefined;
    let handoffArea: LifeArea | undefined;
    let handoffReason: string | undefined;

    const workflowBudget = Math.min(getWorkflowForArea(primaryArea).maxTurns, runtimeConfig.stepBudgetDefault);
    const handoff = runtimeConfig.enableHandoff ? shouldHandoff(primaryArea, primaryAgent) : null;
    if (workflowBudget > 1 && handoff && isPersonaEnabledForArea(input.context, handoff.toArea)) {
      pushEvent(events, `handoff:${primaryArea}->${handoff.toArea}:${handoff.reason}`);
      handoffSpans.push({ from: primaryArea, to: handoff.toArea, reason: handoff.reason });
      handoffAgent = await orchestrateWithAgents(
        `Handoff de ${primaryArea}: ${input.userMessage}`,
        input.context,
        input.orchestratorConfig,
        handoff.toArea
      );
      handoffAgent = applyOutputGuardrails(handoff.toArea, handoffAgent);
      handoffArea = handoff.toArea;
      handoffReason = handoff.reason;
      pushEvent(events, `handoff_done:${handoffAgent.agentId}`);
    }

    const conditional = evaluateConditionalTask(primaryArea, input.context);
    if (
      workflowBudget > 2 &&
      runtimeConfig.enableConditionalEscalation &&
      !handoffAgent &&
      conditional.shouldEscalate &&
      conditional.suggestedArea &&
      isPersonaEnabledForArea(input.context, conditional.suggestedArea)
    ) {
      pushEvent(events, `conditional_escalation:${primaryArea}->${conditional.suggestedArea}:${conditional.reason}`);
      handoffSpans.push({ from: primaryArea, to: conditional.suggestedArea, reason: conditional.reason });
      handoffAgent = await orchestrateWithAgents(
        `Escalacao condicional de ${primaryArea}: ${input.userMessage}`,
        input.context,
        input.orchestratorConfig,
        conditional.suggestedArea
      );
      handoffAgent = applyOutputGuardrails(conditional.suggestedArea, handoffAgent);
      handoffArea = conditional.suggestedArea;
      handoffReason = conditional.reason;
    }
    const termination = shouldTerminate(primaryArea, primaryAgent, handoffAgent);
    pushEvent(events, `termination:${termination.reason}`);

    const result: GraphOrchestratorResult = {
      threadId: input.threadId,
      primaryArea,
      primaryAgent,
      handoffAgent,
      handoffArea,
      handoffReason,
      suggestedAgents: buildSuggestedAgents(primaryArea),
      synthesis: handoffAgent
        ? `${buildSynthesis(config.name, primaryAgent)}\n\nConexao ${primaryArea} -> ${handoffArea}: ${handoffAgent.message}`
        : buildSynthesis(config.name, primaryAgent),
      mood: determineMood(input.context, primaryAgent),
      nextSteps: handoffAgent
        ? [...buildNextSteps(primaryAgent), ...buildNextSteps(handoffAgent)].slice(0, 5)
        : buildNextSteps(primaryAgent),
      events,
      workflowVersion: getWorkflowForArea(primaryArea).version,
      selfEvalScore: selfEvalResult.score,
    };

    if (runtimeConfig.enableSkillManager) {
      // fire-and-forget: learn patterns from this interaction
      updatePatternsAfterInteraction(userId, primaryArea, effectiveContext);
    }

    // Agent Leaderboard (Sprint A — Aider)
    if (runtimeConfig.enableLeaderboard) {
      try {
        recordInteraction({
          agentName: primaryAgent.agentId ?? primaryAgent.agentName ?? 'unknown',
          area: primaryArea,
          selfEvalScore: selfEvalResult.score,
          durationMs: Date.now() - startedAt,
          timestamp: new Date().toISOString(),
          userMessageLength: input.userMessage.length,
          responseLength: primaryAgent.message?.length ?? 0,
        });
      } catch { /* leaderboard is non-blocking */ }
    }

    putGraphCheckpoint(
      checkpointBase(input, 'finalize', 'completed', events, primaryArea)
    );
    saveContextSnapshot(input.threadId, 'finalize', input.context);
    saveTrace({
      traceId,
      threadId: input.threadId,
      area: primaryArea,
      startedAt: new Date(startedAt).toISOString(),
      endedAt: new Date().toISOString(),
      durationMs: Date.now() - startedAt,
      status: 'ok',
      nodes: ['start', 'selector', 'guardrails', 'execute_primary', handoffAgent ? 'handoff' : 'finalize', 'finalize'],
      handoffs: handoffSpans,
      quality: qualityScores(primaryAgent, input.context),
      selfEvalScore: selfEvalResult.score,
    });
    return result;
  } catch (error) {
    saveTrace({
      traceId,
      threadId: input.threadId,
      area: primaryArea,
      startedAt: new Date(startedAt).toISOString(),
      endedAt: new Date().toISOString(),
      durationMs: Date.now() - startedAt,
      status: 'error',
      nodes: ['start', 'selector', 'guardrails', 'execute_primary'],
      handoffs: handoffSpans,
      interruptedReason: error instanceof Error ? error.message : 'unknown',
    });
    throw error;
  }
}

export async function resumeOrchestratorGraph(input: RunGraphInput): Promise<GraphOrchestratorResult | null> {
  const checkpoint = getGraphCheckpoint(input.threadId);
  if (!checkpoint || checkpoint.status !== 'interrupted') return null;
  return runOrchestratorGraph({
    ...input,
    userMessage: `${input.userMessage} (confirmado pelo usuario)`,
  });
}
