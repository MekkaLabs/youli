/**
 * AGENT EXECUTOR
 * Executa um agente especializado com contexto completo do usuário
 */

import {
  AgentDefinition,
  LifeArea,
  OrchestratorConfig,
  DEFAULT_ORCHESTRATOR,
  PERSONA_AREA_MAP,
  getAgentForArea,
  detectAreaFromMessage,
} from './agent-definitions';
import type { HumanDesignSettings, MemoryRecord, PersonaPersonalization } from '@youli/shared';
import { buildMemoryContext } from './memory-scoring';
import { getFunctionPack } from '../kernel/function-packs';
import { pickModel, type Mode } from '../kernel/model-policy';
import { randomUUID } from 'node:crypto';
import { MemoryEngine } from '@youli/memory';
import { getMemoryConnector } from '../kernel/memory-connectors';
import { z } from 'zod';

// ---------- U5: Schema Zod para resposta dos agentes ----------
const AgentResponseSchema = z.object({
  message: z.string().default(''),
  insights: z.array(z.string()).default([]),
  actions: z.array(z.string()).default([]),
  urgency: z.enum(['low', 'medium', 'high']).default('medium'),
  relatedAreas: z.array(z.string()).default([]),
});

// ---------- U8: max_tokens por modo ----------
// Modos "leves" (routing, react_observe, self_eval, sop_step) usam orçamento
// menor; modos "pesados" (synthesis, tot_branch, workflow_plan, skill_extract)
// recebem mais tokens. `analysis` é o default da maioria dos handlers.
const MAX_TOKENS_BY_MODE: Partial<Record<Mode, number>> = {
  routing: 200,
  react_observe: 300,
  self_eval: 400,
  sop_step: 500,
  analysis: 800,
  synthesis: 1200,
  tot_branch: 1500,
  workflow_plan: 1800,
  skill_extract: 1500,
};
function resolveMaxTokens(mode: Mode): number {
  return MAX_TOKENS_BY_MODE[mode] ?? 800;
}

// ---------- U6: Cache LRU de respostas (TTL 5 min) ----------
const RESPONSE_CACHE = new Map<string, { value: AgentResponse; expiresAt: number }>();
const RESPONSE_CACHE_TTL_MS = 5 * 60 * 1000;
const RESPONSE_CACHE_MAX_SIZE = 256;

function cacheGet(key: string): AgentResponse | null {
  const hit = RESPONSE_CACHE.get(key);
  if (!hit) return null;
  if (Date.now() > hit.expiresAt) {
    RESPONSE_CACHE.delete(key);
    return null;
  }
  // LRU touch: re-inserir move para o fim no Map.
  RESPONSE_CACHE.delete(key);
  RESPONSE_CACHE.set(key, hit);
  return hit.value;
}

function cacheSet(key: string, value: AgentResponse): void {
  if (RESPONSE_CACHE.size >= RESPONSE_CACHE_MAX_SIZE) {
    // Evict mais antigo (primeiro do Map).
    const firstKey = RESPONSE_CACHE.keys().next().value;
    if (firstKey) RESPONSE_CACHE.delete(firstKey);
  }
  RESPONSE_CACHE.set(key, { value, expiresAt: Date.now() + RESPONSE_CACHE_TTL_MS });
}

function buildCacheKey(area: LifeArea, userId: string, userMessage: string, contextDigest: string, mode: Mode): string {
  return `${area}|${userId}|${mode}|${fnv1a(userMessage)}|${contextDigest}`;
}

function fnv1a(s: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = (h + ((h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24))) >>> 0;
  }
  return h.toString(16).padStart(8, '0');
}

/**
 * Resumo determinístico do contexto que afeta a resposta — usado como
 * componente da chave de cache. Mudanças em tasks/habits/goals/finances/etc
 * invalidam o cache, mas pequenos detalhes (nomes alheios à decisão) não.
 */
function digestContext(ctx: UserContext): string {
  const parts: string[] = [];
  if (ctx.tasks) parts.push(`t:${ctx.tasks.length}:${ctx.tasks.map(t => `${t.status}/${t.priority}`).join(',')}`);
  if (ctx.habits) parts.push(`h:${ctx.habits.length}:${ctx.habits.map(h => h.streak).join(',')}`);
  if (ctx.goals) parts.push(`g:${ctx.goals.length}:${ctx.goals.map(g => g.progress).join(',')}`);
  if (ctx.finances) parts.push(`f:${ctx.finances.balance}/${ctx.finances.expenses}`);
  if (ctx.fitness?.weeklyActivities !== undefined) parts.push(`fit:${ctx.fitness.weeklyActivities}`);
  if (ctx.calendar) parts.push(`c:${ctx.calendar.length}`);
  if (ctx.memoryContext) parts.push(`m:${ctx.memoryContext.length}`);
  return fnv1a(parts.join('|'));
}

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';

// Timeout para a chamada da Anthropic (Vercel function tem 60s para copilot,
// 25s deixa margem para fallback e síntese subsequente).
const ANTHROPIC_TIMEOUT_MS = 25_000;

// Retries: tentativa inicial + até MAX_RETRIES extras em erros 5xx/timeout/network.
const MAX_RETRIES = 2;
const BACKOFF_BASE_MS = 400;

type AgentErrorKind =
  | 'timeout'
  | 'network'
  | 'http_4xx'
  | 'http_5xx'
  | 'parse_error'
  | 'no_json'
  | 'unknown';

class AgentExecutorError extends Error {
  constructor(
    public kind: AgentErrorKind,
    message: string,
    public status?: number,
    public retryable: boolean = false,
  ) {
    super(message);
    this.name = 'AgentExecutorError';
  }
}

function classifyFetchError(err: unknown): AgentExecutorError {
  if (err instanceof AgentExecutorError) return err;
  if (err instanceof Error) {
    if (err.name === 'AbortError' || /timeout/i.test(err.message)) {
      return new AgentExecutorError('timeout', err.message, undefined, true);
    }
    return new AgentExecutorError('network', err.message, undefined, true);
  }
  return new AgentExecutorError('unknown', String(err), undefined, false);
}

function logAgentEvent(
  level: 'info' | 'warn' | 'error',
  scope: string,
  payload: Record<string, unknown>,
) {
  const line = { level, scope, ts: new Date().toISOString(), ...payload };
  // eslint-disable-next-line no-console
  const out = level === 'error' ? console.error : level === 'warn' ? console.warn : console.log;
  out(`[agent-executor]`, line);
}

async function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

// ---------- Memory hydration ----------

// Singleton do MemoryEngine para reuso entre execuções de agente
// (evita reabrir conexão Zep/Supabase a cada chamada).
let _memoryEngine: MemoryEngine | null = null;
function getMemoryEngineSingleton(userId: string): MemoryEngine {
  if (!_memoryEngine) {
    _memoryEngine = new MemoryEngine({
      supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
      supabaseKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
      profileId: process.env.YOULI_PROFILE_ID,
      anthropicKey: process.env.ANTHROPIC_API_KEY,
      userId,
    });
  }
  return _memoryEngine;
}

/**
 * Hidrata `context.memoryRecords` e `context.memoryContext` quando vazios.
 * Combina:
 *  - Memórias locais do connector (LocalMemoryConnector) — rápidas, todas as origens
 *  - Para o agente Sócrates (insights), prioriza notas do Obsidian via MemoryEngine.search
 *
 * Não falha se MemoryEngine estiver indisponível (Zep/Supabase off) — apenas
 * usa o connector local como fallback.
 */
async function hydrateMemoryContext(
  area: LifeArea,
  userMessage: string,
  context: UserContext,
  userId: string,
): Promise<UserContext> {
  // Se já tem registros suficientes, não busca de novo.
  if ((context.memoryRecords?.length ?? 0) >= 4) return context;
  if ((context.memoryContext?.length ?? 0) >= 4) return context;

  const merged: UserContext = { ...context };
  const records: MemoryRecord[] = [...(merged.memoryRecords ?? [])];
  const extraSnippets: string[] = [];

  // 1) Connector local — pega memórias recentes do usuário (qualquer origem).
  try {
    const connector = getMemoryConnector();
    const local = await connector.list({ userId, limit: 40 });
    for (const r of local) {
      if (!records.find((x) => x.id === r.id)) records.push(r);
    }
  } catch (err) {
    logAgentEvent('warn', 'memory_connector_fail', {
      area,
      error: err instanceof Error ? err.message : String(err),
    });
  }

  // 2) Busca semântica via Engine — prioritária para 'insights' (Sócrates).
  //    Para outras áreas, só faz se houver query do usuário (poupa custo).
  const shouldVectorSearch = userMessage && (area === 'insights' || area === 'dashboard');
  if (shouldVectorSearch) {
    try {
      const engine = getMemoryEngineSingleton(userId);
      // Sócrates: prioriza notas do vault Obsidian
      const origin = area === 'insights' ? 'obsidian' : undefined;
      const found = await engine.search(userMessage, { limit: 4, origin });
      for (const m of found) {
        extraSnippets.push(`[${m.origin ?? m.source}] ${m.content}`);
      }
    } catch (err) {
      logAgentEvent('warn', 'memory_engine_fail', {
        area,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  merged.memoryRecords = records.slice(0, 40);
  if (extraSnippets.length > 0) {
    merged.memoryContext = [...(merged.memoryContext ?? []), ...extraSnippets].slice(0, 8);
  }
  return merged;
}

/**
 * Faz a chamada à Anthropic com timeout + retry exponencial em erros transientes.
 */
async function callAnthropicWithRetry(
  apiKey: string,
  body: unknown,
  requestId: string,
  agentId: string,
): Promise<{ text: string; latencyMs: number; attempts: number }> {
  let lastError: AgentExecutorError | null = null;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const startedAt = Date.now();
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), ANTHROPIC_TIMEOUT_MS);

    try {
      const response = await fetch(ANTHROPIC_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      const latencyMs = Date.now() - startedAt;

      if (!response.ok) {
        const status = response.status;
        const isRetryable = status >= 500 || status === 429;
        const kind: AgentErrorKind = status >= 500 ? 'http_5xx' : 'http_4xx';
        const errText = await response.text().catch(() => '');
        const err = new AgentExecutorError(kind, `Anthropic API ${status}: ${errText.slice(0, 200)}`, status, isRetryable);

        if (!isRetryable || attempt === MAX_RETRIES) {
          logAgentEvent('error', 'anthropic_call', { requestId, agentId, attempt, latencyMs, kind, status });
          throw err;
        }
        lastError = err;
        logAgentEvent('warn', 'anthropic_retry', { requestId, agentId, attempt, latencyMs, kind, status });
      } else {
        const data = await response.json();
        const text: string = data.content?.[0]?.text ?? '';
        logAgentEvent('info', 'anthropic_ok', { requestId, agentId, attempt, latencyMs });
        return { text, latencyMs, attempts: attempt + 1 };
      }
    } catch (rawErr) {
      clearTimeout(timeoutId);
      const latencyMs = Date.now() - startedAt;
      const err = classifyFetchError(rawErr);
      if (!err.retryable || attempt === MAX_RETRIES) {
        logAgentEvent('error', 'anthropic_call', { requestId, agentId, attempt, latencyMs, kind: err.kind });
        throw err;
      }
      lastError = err;
      logAgentEvent('warn', 'anthropic_retry', { requestId, agentId, attempt, latencyMs, kind: err.kind });
    }

    // Backoff exponencial + jitter.
    const delay = BACKOFF_BASE_MS * 2 ** attempt + Math.floor(Math.random() * 100);
    await sleep(delay);
  }

  // Defensivo — não deveria chegar aqui.
  throw lastError ?? new AgentExecutorError('unknown', 'retry loop exited unexpectedly');
}

export interface UserContext {
  /** ID do usuário autenticado. Quando ausente, usa YOULI_PROFILE_ID. */
  userId?: string;
  profile?: {
    name: string;
    objectives?: string[];
    lifeAreas?: string[];
    orchestratorName?: string;
    orchestratorEmoji?: string;
    humanDesign?: HumanDesignSettings;
    aiPersonalization?: {
      personas: PersonaPersonalization[];
    };
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
  calendar?: Array<{ title: string; date: string; type: string; durationMin?: number }>;
  insights?: Array<{ content: string; type: string }>;
  memoryContext?: string[];
  memoryRecords?: MemoryRecord[];

  /**
   * Sinais cross-area opcionais. Quando presentes, `buildContextBlock`
   * injeta no system prompt de Leonardo/Sócrates/Marco Aurélio para
   * embasar respostas em vez de hallucinar.
   */
  signals?: {
    /** Life Health Score 0-100 (parallel-evaluator). */
    lifeHealthScore?: number;
    /** ANC Score 0-100 (anc-scorer). */
    ancScore?: number;
    /** Maintainability Score 0-100. */
    maintainabilityScore?: number;
    /** Áreas críticas detectadas pelo parallel-evaluator. */
    criticalAreas?: string[];
    /** Top prioridades sugeridas. */
    topPriorities?: string[];
    /** Gamificação. */
    xp?: { total: number; level: number };
    /** Modo do Open Finance — se 'mock', Adam Smith deve avisar o usuário. */
    openFinanceMode?: 'mock' | 'pluggy' | 'belvo';
    /** Pomodoro/Deep Work stats (alimenta Tesla). */
    pomodoroStats?: { sessionsLast7d: number; avgDurationMin: number };
    /** Valores declarados pelo usuário (Marco Aurélio). */
    declaredValues?: string[];
  };
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
  orchestratorConfig?: Partial<OrchestratorConfig>,
  mode?: Mode
): Promise<AgentResponse> {
  const persona = getPersonaByArea(context, area);
  if (persona && !persona.enabled) {
    const fallbackAgent = getAgentForArea(area);
    const orchestrator = { ...DEFAULT_ORCHESTRATOR, ...orchestratorConfig };
    const orchestratorName = context.profile?.orchestratorName || orchestrator.name;
    return generateFallbackResponse(fallbackAgent, userMessage, context, orchestratorName);
  }
  const agent = getAgentForArea(area);
  const apiKey = process.env.ANTHROPIC_API_KEY;
  const orchestrator = { ...DEFAULT_ORCHESTRATOR, ...orchestratorConfig };
  const orchestratorName =
    context.profile?.orchestratorName || orchestrator.name;

  if (!apiKey) {
    return generateFallbackResponse(agent, userMessage, context, orchestratorName);
  }

  // Hidrata memória contextual do usuário (LocalDB + MemoryEngine vault) se
  // o caller não passou explícito. Sócrates prioriza notas do Obsidian.
  const userId = context.userId ?? process.env.YOULI_PROFILE_ID ?? 'default';
  const enrichedContext = await hydrateMemoryContext(area, userMessage, context, userId);

  // U6: tenta cache antes de chamar a API (TTL 5min).
  const resolvedMode: Mode = mode || 'analysis';
  const cacheKey = buildCacheKey(area, userId, userMessage, digestContext(enrichedContext), resolvedMode);
  const cached = cacheGet(cacheKey);
  if (cached) {
    logAgentEvent('info', 'cache_hit', { agentId: agent.id, area, cacheKey });
    return cached;
  }

  const contextBlock = buildContextBlock(area, enrichedContext, userMessage);
  const hdContextBlock = buildHumanDesignContext(area, enrichedContext);
  const userPrompt = `${contextBlock}
${hdContextBlock ? `\n${hdContextBlock}\n` : ''}
PACK DE FUNCOES DA AREA:
${getFunctionPack(area).map((x) => `- ${x}`).join('\n')}

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

  const requestId = randomUUID();
  const requestStartedAt = Date.now();

  try {
    const { text, latencyMs, attempts } = await callAnthropicWithRetry(
      apiKey,
      {
        model: pickModel(resolvedMode, area),
        max_tokens: resolveMaxTokens(resolvedMode),
        system: agent.systemPrompt,
        messages: [{ role: 'user', content: userPrompt }],
      },
      requestId,
      agent.id,
    );

    // U5: extrai JSON da resposta com Zod (mais robusto que regex+JSON.parse).
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      logAgentEvent('warn', 'no_json_in_response', {
        requestId,
        agentId: agent.id,
        textPreview: text.slice(0, 120),
      });
      throw new AgentExecutorError('no_json', 'No JSON in response');
    }

    let raw: unknown;
    try {
      raw = JSON.parse(jsonMatch[0]);
    } catch (parseErr) {
      logAgentEvent('warn', 'json_parse_failed', {
        requestId,
        agentId: agent.id,
        error: parseErr instanceof Error ? parseErr.message : String(parseErr),
      });
      throw new AgentExecutorError('parse_error', 'JSON parse failed');
    }

    const validated = AgentResponseSchema.safeParse(raw);
    if (!validated.success) {
      logAgentEvent('warn', 'schema_validation_failed', {
        requestId,
        agentId: agent.id,
        issues: validated.error.flatten(),
      });
      throw new AgentExecutorError('parse_error', 'Schema validation failed');
    }
    const parsed = validated.data;

    logAgentEvent('info', 'agent_response_ok', {
      requestId,
      agentId: agent.id,
      area: agent.area,
      latencyMs,
      attempts,
      totalMs: Date.now() - requestStartedAt,
    });

    const response: AgentResponse = {
      agentId: agent.id,
      agentName: agent.name,
      agentEmoji: agent.emoji,
      agentColor: agent.color,
      area: agent.area,
      message: parsed.message,
      insights: parsed.insights,
      actions: parsed.actions,
      urgency: parsed.urgency,
      confidence: 0.92,
      relatedAreas: parsed.relatedAreas as LifeArea[],
      orchestratorName,
    };
    cacheSet(cacheKey, response);
    return response;
  } catch (rawErr) {
    const err = rawErr instanceof AgentExecutorError ? rawErr : classifyFetchError(rawErr);
    logAgentEvent('error', 'agent_failed_fallback', {
      requestId,
      agentId: agent.id,
      area: agent.area,
      kind: err.kind,
      status: err.status,
      totalMs: Date.now() - requestStartedAt,
      message: err.message,
    });
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

// ---------- Helpers de contexto por agente ----------

function daysSinceIso(iso?: string): number | null {
  if (!iso) return null;
  const ms = Date.now() - new Date(iso).getTime();
  if (!Number.isFinite(ms)) return null;
  return Math.floor(ms / 86_400_000);
}

function daysUntilIso(iso?: string): number | null {
  if (!iso) return null;
  const ms = new Date(iso).getTime() - Date.now();
  if (!Number.isFinite(ms)) return null;
  return Math.ceil(ms / 86_400_000);
}

function buildContextBlock(area: LifeArea, ctx: UserContext, userMessage?: string): string {
  const blocks: string[] = [];

  if (ctx.profile) {
    const objectives = ctx.profile.objectives?.join(', ') || 'não definidos';
    blocks.push(`PERFIL: ${ctx.profile.name} | Objetivos: ${objectives}`);
  }

  // A1 — Leonardo (dashboard): injetar Life Health / ANC / áreas críticas.
  if (area === 'dashboard' && ctx.signals) {
    const s = ctx.signals;
    const parts: string[] = [];
    if (s.lifeHealthScore !== undefined) parts.push(`LifeHealth ${s.lifeHealthScore}/100`);
    if (s.ancScore !== undefined) parts.push(`ANC ${s.ancScore}/100`);
    if (s.maintainabilityScore !== undefined) parts.push(`Maintainability ${s.maintainabilityScore}/100`);
    if (parts.length) blocks.push(`SINAIS SISTÊMICOS: ${parts.join(' | ')}`);
    if (s.criticalAreas?.length) blocks.push(`ÁREAS CRÍTICAS: ${s.criticalAreas.join(', ')}`);
    if (s.topPriorities?.length) blocks.push(`PRIORIDADES SUGERIDAS: ${s.topPriorities.slice(0, 3).join(' | ')}`);
  }

  // A2 — Franklin (tarefas): priorizar doing/todo, detectar "stuck" (sem nextStep
  // ou priority >= 4 e em todo há muito tempo). Mostra MIT (priority máx).
  if ((area === 'tarefas' || area === 'dashboard') && ctx.tasks?.length) {
    const active = ctx.tasks.filter((t) => t.status === 'doing' || t.status === 'todo');
    const stuck = active.filter((t) => t.priority >= 4 && !t.nextStep);
    const mit = [...active].sort((a, b) => b.priority - a.priority)[0];
    const summary = active
      .slice(0, 5)
      .map((t) => `${t.title} [${t.status}] prio:${t.priority}${t.nextStep ? '' : ' (sem nextStep)'}`)
      .join(' | ');
    blocks.push(`TAREFAS (${active.length} ativas): ${summary}`);
    if (mit) blocks.push(`MIT (Most Important Task): "${mit.title}" prio:${mit.priority}`);
    if (stuck.length > 0) {
      blocks.push(`⚠️ TAREFAS DE ALTA PRIORIDADE SEM PRÓXIMO PASSO: ${stuck.slice(0, 3).map((t) => t.title).join(' | ')}`);
    }
  }

  // A3 — Aristóteles (hábitos): mostra avg/top streak, detecta hábitos em risco.
  if ((area === 'habitos' || area === 'dashboard') && ctx.habits?.length) {
    const summary = ctx.habits.slice(0, 5).map((h) => `${h.title} streak:${h.streak}`).join(' | ');
    const avgStreak = Math.round(ctx.habits.reduce((s, h) => s + h.streak, 0) / ctx.habits.length);
    const topHabit = [...ctx.habits].sort((a, b) => b.streak - a.streak)[0];
    const atRisk = ctx.habits.filter((h) => h.streak === 0);
    const stale = ctx.habits.filter((h) => {
      const d = daysSinceIso(h.lastCheckin);
      return d !== null && d >= 2;
    });
    blocks.push(`HÁBITOS (${ctx.habits.length}): ${summary}`);
    blocks.push(`STREAK MÉDIO: ${avgStreak} dias | TOP: "${topHabit?.title}" (${topHabit?.streak})`);
    if (atRisk.length > 0) {
      blocks.push(`⚠️ HÁBITOS COM STREAK 0: ${atRisk.slice(0, 3).map((h) => h.title).join(' | ')}`);
    }
    if (stale.length > 0) {
      blocks.push(`⚠️ SEM CHECK-IN HÁ 2+ DIAS: ${stale.slice(0, 3).map((h) => h.title).join(' | ')}`);
    }
  }

  // A4 — Alexandre (metas): mostra daysLeft, detecta metas estagnadas, cruza com hábitos.
  if ((area === 'metas' || area === 'dashboard') && ctx.goals?.length) {
    const active = ctx.goals.filter((g) => g.status === 'active');
    const summary = active
      .slice(0, 4)
      .map((g) => {
        const dl = daysUntilIso(g.deadline);
        const dlStr = dl !== null ? ` (${dl}d restantes)` : '';
        return `${g.title} ${g.progress}%${dlStr}`;
      })
      .join(' | ');
    blocks.push(`METAS ATIVAS (${active.length}): ${summary}`);

    const overdue = active.filter((g) => {
      const dl = daysUntilIso(g.deadline);
      return dl !== null && dl < 0 && g.progress < 100;
    });
    if (overdue.length > 0) {
      blocks.push(`⚠️ METAS VENCIDAS: ${overdue.map((g) => `"${g.title}" (${g.progress}%)`).join(' | ')}`);
    }

    const stalled = active.filter((g) => g.progress < 30);
    if (stalled.length > 0) {
      blocks.push(`⚠️ METAS EM RISCO (progresso < 30%): ${stalled.slice(0, 3).map((g) => g.title).join(' | ')}`);
    }
  }

  // A5 — Adam Smith (finanças): savings rate, top categorias, badge de mock.
  if ((area === 'financeiro' || area === 'dashboard') && ctx.finances) {
    const { balance, income, expenses } = ctx.finances;
    const savings = income > 0 ? Math.round(((income - expenses) / income) * 100) : null;
    blocks.push(
      `FINANÇAS: Saldo R$${balance} | Receita R$${income} | Gastos R$${expenses}` +
        (savings !== null ? ` | Taxa de poupança ${savings}%` : ''),
    );
    if (ctx.finances.recentTransactions?.length) {
      // A5: usar TODAS as transações para extrair top categorias por gasto
      const byCategory = new Map<string, number>();
      for (const t of ctx.finances.recentTransactions) {
        if (t.amount < 0) {
          byCategory.set(t.category, (byCategory.get(t.category) ?? 0) + Math.abs(t.amount));
        }
      }
      const topCats = [...byCategory.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([cat, total]) => `${cat} R$${total.toFixed(0)}`);
      if (topCats.length) blocks.push(`TOP CATEGORIAS DE GASTO: ${topCats.join(' | ')}`);

      const recentTxs = ctx.finances.recentTransactions.slice(0, 5).map((t) =>
        `${t.description} R$${Math.abs(t.amount)}`,
      );
      blocks.push(`TRANSAÇÕES RECENTES: ${recentTxs.join(' | ')}`);
    }
    if (ctx.signals?.openFinanceMode === 'mock') {
      blocks.push(`⚠️ MODO MOCK: dados financeiros são simulados — avise o usuário antes de recomendar ações concretas.`);
    }
  }

  // A6 — Hipócrates (fitness): equilíbrio treino/descanso, overtraining alert.
  if ((area === 'fitness' || area === 'dashboard') && ctx.fitness) {
    const { weeklyActivities, goalWeeklyActivities, lastActivity } = ctx.fitness;
    const w = weeklyActivities ?? 0;
    const g = goalWeeklyActivities ?? 0;
    blocks.push(`FITNESS: ${w}/${g} treinos esta semana | Último: ${lastActivity || 'desconhecido'}`);
    if (w > 0 && g > 0) {
      const pct = Math.round((w / g) * 100);
      if (pct > 140) blocks.push(`⚠️ POSSÍVEL OVERTRAINING: ${pct}% da meta semanal — sugerir dia de recuperação.`);
      else if (pct < 50) blocks.push(`⚠️ AQUÉM DA META: ${pct}% — sugerir 1 atividade rápida hoje.`);
    }
    const daysSinceLast = daysSinceIso(lastActivity);
    if (daysSinceLast !== null && daysSinceLast >= 3) {
      blocks.push(`⚠️ ÚLTIMA ATIVIDADE HÁ ${daysSinceLast} DIAS.`);
    }
  }

  // A7 — Newton (calendário): back-to-back detection, contagem de eventos.
  if (area === 'calendario' && ctx.calendar?.length) {
    const events = ctx.calendar.slice(0, 6).map((e) => `${e.title} em ${e.date}`).join(' | ');
    blocks.push(`AGENDA (${ctx.calendar.length} eventos): ${events}`);

    // Back-to-back: ordena por data e detecta gaps < 15min entre evento N e N+1.
    const sorted = [...ctx.calendar]
      .filter((e) => e.date)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const backToBack: string[] = [];
    for (let i = 0; i < sorted.length - 1; i++) {
      const endA = new Date(sorted[i].date).getTime() + (sorted[i].durationMin ?? 60) * 60_000;
      const startB = new Date(sorted[i + 1].date).getTime();
      const gapMin = (startB - endA) / 60_000;
      if (gapMin >= 0 && gapMin < 15) {
        backToBack.push(`"${sorted[i].title}" → "${sorted[i + 1].title}" (gap ${Math.round(gapMin)}min)`);
      }
    }
    if (backToBack.length > 0) {
      blocks.push(`⚠️ EVENTOS BACK-TO-BACK (gap < 15min): ${backToBack.slice(0, 3).join(' | ')}`);
    }

    // Cruzamento com tasks de alta prioridade — sinalizar se não há bloco para elas.
    if (ctx.tasks?.length) {
      const highPrioActive = ctx.tasks.filter((t) => t.priority >= 4 && t.status !== 'done');
      const titles = highPrioActive.map((t) => t.title.toLowerCase());
      const hasBlockForHigh = titles.some((tt) =>
        ctx.calendar!.some((e) => e.title.toLowerCase().includes(tt.slice(0, 12))),
      );
      if (highPrioActive.length > 0 && !hasBlockForHigh) {
        blocks.push(`⚠️ TAREFAS DE PRIORIDADE ${'≥'}4 SEM BLOCO NO CALENDÁRIO: ${highPrioActive.slice(0, 2).map((t) => t.title).join(' | ')}`);
      }
    }
  }

  // A9 — Tesla (foco): pomodoro stats se disponível.
  if (area === 'foco' && ctx.signals?.pomodoroStats) {
    const p = ctx.signals.pomodoroStats;
    blocks.push(`SESSÕES DE FOCO (7d): ${p.sessionsLast7d} | duração média ${p.avgDurationMin}min`);
  }

  // A10 — Marco Aurélio (perfil): XP e valores declarados.
  if (area === 'perfil') {
    if (ctx.signals?.xp) {
      blocks.push(`XP: nível ${ctx.signals.xp.level} | total ${ctx.signals.xp.total}`);
    }
    if (ctx.signals?.declaredValues?.length) {
      blocks.push(`VALORES DECLARADOS: ${ctx.signals.declaredValues.join(', ')}`);
    } else if (ctx.profile?.objectives?.length) {
      // Sem valores explícitos, usa objetivos como proxy honesto — sem inventar.
      blocks.push(`OBJETIVOS COMO PROXY DE VALORES: ${ctx.profile.objectives.slice(0, 3).join(', ')}`);
    }
  }

  // Memória contextual (A8 + Sócrates priority via hydrateMemoryContext).
  const ranked = buildMemoryContext(userMessage || '', ctx);
  const memory = [...(ctx.memoryContext || []), ...ranked];
  if (memory.length) {
    // Sócrates ganha mais contexto que os outros.
    const limit = area === 'insights' ? 6 : 3;
    blocks.push(`CONTEXTO ANTERIOR: ${memory.slice(0, limit).join(' | ')}`);
  }

  return blocks.join('\n');
}

function getPersonaByArea(ctx: UserContext, area: LifeArea): PersonaPersonalization | null {
  const personas = ctx.profile?.aiPersonalization?.personas || [];
  const persona = personas.find((p) => p.area === area) || null;
  if (!persona) return null;
  const mappedArea = PERSONA_AREA_MAP[persona.personaId];
  if (mappedArea !== area) return null;
  return persona;
}

function buildHumanDesignContext(area: LifeArea, ctx: UserContext): string {
  const hd = ctx.profile?.humanDesign;
  const persona = getPersonaByArea(ctx, area);
  if (!hd || !persona) return '';

  const canUseHD =
    hd.enabled === true &&
    hd.consentAccepted === true &&
    hd.mode === 'assistive' &&
    persona.humanDesignEnabled === true;

  if (!canUseHD) return '';

  const birth = hd.birthData;
  const chart = hd.chart;
  if (!birth && !chart) return '';

  const chunks: string[] = ['HUMAN DESIGN CONTEXTO (assistivo, opcional):'];
  if (birth) {
    chunks.push(`- Nascimento: ${birth.date} ${birth.time} em ${birth.location}${birth.timezone ? ` (${birth.timezone})` : ''}`);
  }
  if (chart?.type) chunks.push(`- Tipo: ${chart.type}`);
  if (chart?.strategy) chunks.push(`- Estratégia: ${chart.strategy}`);
  if (chart?.authority) chunks.push(`- Autoridade: ${chart.authority}`);
  if (chart?.profile) chunks.push(`- Perfil HD: ${chart.profile}`);
  if (chart?.definition) chunks.push(`- Definição: ${chart.definition}`);
  if (chart?.summary) chunks.push(`- Resumo: ${chart.summary}`);
  chunks.push('- Use este contexto apenas para personalizar tom e recomendações, sem afirmar certezas absolutas.');
  return chunks.join('\n');
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
