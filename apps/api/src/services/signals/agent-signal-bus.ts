/**
 * AGENT SIGNAL BUS
 * Sistema pub/sub entre agentes históricos do Youli
 * Inspirado no MiroFish: agentes que interagem e geram comportamentos emergentes
 *
 * Exemplos:
 *   Franklin (tasks) ──► Alexandre (goals): "tarefa crítica concluída"
 *   Hipócrates (fitness) ──► Sócrates (insights): "7 dias sem exercício"
 *   Adam (finance) ──► Marco (perfil): "meta financeira atingida"
 *   Sócrates ──► orchestrator: "padrão emergente detectado"
 */

import { createClient } from '@supabase/supabase-js';

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

export type SignalType =
  | 'task_completed'       // Franklin → Alexandre
  | 'task_overdue'         // Franklin → orchestrator
  | 'habit_streak_broken'  // Aristóteles → Sócrates
  | 'habit_milestone'      // Aristóteles → Marco
  | 'goal_at_risk'         // Alexandre → orchestrator
  | 'goal_completed'       // Alexandre → Leonardo
  | 'finance_alert'        // Adam → Marco
  | 'fitness_inactive'     // Hipócrates → Sócrates
  | 'fitness_milestone'    // Hipócrates → Aristóteles
  | 'insight_found'        // Sócrates → orchestrator
  | 'focus_session_done'   // Tesla → Franklin
  | 'pattern_detected'     // Sócrates → orchestrator (emergente)
  | 'custom';

export interface AgentSignal {
  fromAgent: string;
  toAgent: string | '*'; // '*' = broadcast para todos
  type: SignalType;
  payload: Record<string, unknown>;
  priority: 'low' | 'medium' | 'high' | 'critical';
}

export interface ProcessedSignal {
  signalId: string;
  fromAgent: string;
  toAgent: string;
  type: SignalType;
  payload: Record<string, unknown>;
  response?: string;     // O que o agente receptor fez com o sinal
  impact: string;        // Impacto na UI para o usuário
  createdAt: Date;
}

// ──────────────────────────────────────────────
// CONTEXTO DE VIDA (input do detector)
// ──────────────────────────────────────────────

export interface LifeContextTask {
  title?: string;
  status?: string;
  priority?: number;
}
export interface LifeContextHabit {
  title?: string;
  streak?: number;
  frequency?: string;
}
export interface LifeContextGoal {
  title?: string;
  progress?: number;
  deadline?: string | null;
}
export interface LifeContextFinances {
  income?: number;
  expenses?: number;
}
export interface LifeContextFitness {
  weeklyActivities?: number;
  lastActivity?: string | null;
}
export interface LifeContext {
  tasks?: LifeContextTask[];
  habits?: LifeContextHabit[];
  goals?: LifeContextGoal[];
  finances?: LifeContextFinances | null;
  fitness?: LifeContextFitness | null;
}

// ──────────────────────────────────────────────
// PAYLOADS TIPADOS POR TIPO DE SINAL
// ──────────────────────────────────────────────

interface TaskCompletedPayload { taskTitle: string; priority: number }
interface HabitStreakBrokenPayload { habits: string[]; count: number }
interface HabitMilestonePayload { habitTitle: string; streak: number }
interface GoalAtRiskPayload { goals: { title?: string; progress?: number }[] }
interface FinanceAlertPayload { savingsRate: number; message: string }
interface FitnessInactivePayload { daysInactive: number; lastActivity?: string | null }
interface PatternDetectedPayload { pattern: string; confidence: number }

// ──────────────────────────────────────────────
// ENVIO DE SINAL
// ──────────────────────────────────────────────

export async function sendSignal(
  profileId: string,
  signal: AgentSignal
): Promise<string | null> {
  const sb = getSupabase();

  // Em memória (quando sem Supabase)
  inMemoryBus.push({ ...signal, profileId, timestamp: new Date() });
  if (inMemoryBus.length > 50) inMemoryBus.shift();

  if (!sb) return `in-memory-${Date.now()}`;

  try {
    const { data } = await sb.rpc('send_agent_signal', {
      p_profile_id: profileId,
      p_from_agent: signal.fromAgent,
      p_to_agent: signal.toAgent,
      p_signal_type: signal.type,
      p_payload: signal.payload,
      p_priority: signal.priority,
    });
    return data;
  } catch (err) {
    console.warn('[SignalBus] sendSignal error:', err);
    return null;
  }
}

// ──────────────────────────────────────────────
// PROCESSADOR DE SINAIS (cross-agent logic)
// ──────────────────────────────────────────────

/**
 * Processa sinais pendentes — chamado periodicamente ou após eventos
 * Implementa a "inteligência emergente" dos agentes interagindo
 */
export async function processSignals(
  profileId: string,
  context: LifeContext
): Promise<ProcessedSignal[]> {
  const signals = await detectSignals(profileId, context);
  const processed: ProcessedSignal[] = [];

  for (const signal of signals) {
    const response = await handleSignal(signal);
    if (response) {
      processed.push({
        signalId: `sig-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        fromAgent: signal.fromAgent,
        toAgent: String(signal.toAgent),
        type: signal.type,
        payload: signal.payload,
        response: response.agentResponse,
        impact: response.userImpact,
        createdAt: new Date(),
      });

      // Persiste o sinal
      await sendSignal(profileId, signal);
    }
  }

  return processed;
}

// ──────────────────────────────────────────────
// DETECTOR AUTOMÁTICO DE SINAIS
// ──────────────────────────────────────────────

async function detectSignals(
  profileId: string,
  ctx: LifeContext
): Promise<AgentSignal[]> {
  const signals: AgentSignal[] = [];

  // ── Franklin → Alexandre: tarefa crítica concluída
  const criticalDone = ctx.tasks?.filter(
    (t) => t.status === 'done' && (t.priority ?? 0) >= 4
  ) || [];
  for (const task of criticalDone.slice(0, 2)) {
    signals.push({
      fromAgent: 'franklin',
      toAgent: 'alexandre',
      type: 'task_completed',
      payload: { taskTitle: task.title, priority: task.priority },
      priority: 'medium',
    });
  }

  // ── Aristóteles → Sócrates: streak quebrado
  const brokenHabits = ctx.habits?.filter((h) => h.streak === 0 && h.frequency === 'daily') || [];
  if (brokenHabits.length >= 2) {
    signals.push({
      fromAgent: 'aristoteles',
      toAgent: 'socrates',
      type: 'habit_streak_broken',
      payload: { habits: brokenHabits.map((h) => h.title), count: brokenHabits.length },
      priority: 'high',
    });
  }

  // ── Aristóteles → Marco: milestone de hábito
  const milestoneHabits = ctx.habits?.filter((h) => [7, 21, 30, 66, 100].includes(h.streak ?? -1)) || [];
  for (const habit of milestoneHabits.slice(0, 1)) {
    signals.push({
      fromAgent: 'aristoteles',
      toAgent: 'marco',
      type: 'habit_milestone',
      payload: { habitTitle: habit.title, streak: habit.streak },
      priority: 'medium',
    });
  }

  // ── Alexandre → orchestrator: meta em risco
  const atRiskGoals = ctx.goals?.filter((g) => (g.progress ?? 100) < 20 && g.deadline) || [];
  if (atRiskGoals.length > 0) {
    signals.push({
      fromAgent: 'alexandre',
      toAgent: '*',
      type: 'goal_at_risk',
      payload: { goals: atRiskGoals.map((g) => ({ title: g.title, progress: g.progress })) },
      priority: 'high',
    });
  }

  // ── Adam → Marco: alerta financeiro
  if (ctx.finances) {
    const income = ctx.finances.income ?? 0;
    const expenses = ctx.finances.expenses ?? 0;
    const savingsRate = income > 0 ? (income - expenses) / income : 0;
    if (savingsRate < 0.05) {
      signals.push({
        fromAgent: 'adam',
        toAgent: 'marco',
        type: 'finance_alert',
        payload: { savingsRate: savingsRate * 100, message: 'Taxa de poupança crítica < 5%' },
        priority: 'critical',
      });
    }
  }

  // ── Hipócrates → Sócrates: inatividade física
  if (ctx.fitness && ctx.fitness.weeklyActivities === 0) {
    signals.push({
      fromAgent: 'hipocrates',
      toAgent: 'socrates',
      type: 'fitness_inactive',
      payload: { daysInactive: 7, lastActivity: ctx.fitness.lastActivity },
      priority: 'medium',
    });
  }

  // ── Sócrates: detecção de padrão emergente (cross-agent)
  const emergingPattern = detectEmergingPattern(ctx);
  if (emergingPattern) {
    signals.push({
      fromAgent: 'socrates',
      toAgent: '*',
      type: 'pattern_detected',
      payload: { pattern: emergingPattern, confidence: 0.75 },
      priority: 'high',
    });
  }

  return signals;
}

// ──────────────────────────────────────────────
// HANDLER DE SINAL (o que cada agente faz ao receber)
// ──────────────────────────────────────────────

async function handleSignal(
  signal: AgentSignal
): Promise<{ agentResponse: string; userImpact: string } | null> {

  const handlers: Partial<Record<SignalType, () => { agentResponse: string; userImpact: string } | null>> = {
    task_completed: () => {
      const { taskTitle } = signal.payload as unknown as TaskCompletedPayload;
      if (signal.toAgent === 'alexandre') {
        return {
          agentResponse: `Alexandre recebeu: tarefa crítica "${taskTitle}" concluída. Verificando impacto nas metas...`,
          userImpact: `⚔️ Alexandre: "${taskTitle}" pode ter avançado uma de suas metas. Veja o quadro de metas!`,
        };
      }
      return null;
    },

    habit_streak_broken: () => {
      const { habits, count } = signal.payload as unknown as HabitStreakBrokenPayload;
      return {
        agentResponse: `Sócrates recebeu alerta de Aristóteles: ${count} hábitos sem streak. Analisando padrão...`,
        userImpact: `🦉 Sócrates detectou: ${count} hábitos quebrados (${habits.slice(0,2).join(', ')}). O que está impedindo a consistência?`,
      };
    },

    habit_milestone: () => {
      const { habitTitle, streak } = signal.payload as unknown as HabitMilestonePayload;
      return {
        agentResponse: `Marco recebeu: marco de ${streak} dias em "${habitTitle}".`,
        userImpact: `👑 Marco Aurélio celebra: ${streak} dias de "${habitTitle}"! Isso revela disciplina genuína — parte do seu caráter.`,
      };
    },

    goal_at_risk: () => {
      const { goals } = signal.payload as unknown as GoalAtRiskPayload;
      return {
        agentResponse: `Broadcast de Alexandre: ${goals.length} meta(s) em risco. Todos os agentes em alerta.`,
        userImpact: `⚔️ Alerta de Alexandre: ${goals[0]?.title} com apenas ${goals[0]?.progress}% de progresso. Intervenção necessária!`,
      };
    },

    finance_alert: () => {
      const { savingsRate } = signal.payload as unknown as FinanceAlertPayload;
      return {
        agentResponse: `Marco recebeu alerta crítico de Adam: taxa de poupança de ${savingsRate.toFixed(0)}%.`,
        userImpact: `💰 Adam Smith alerta: sua taxa de poupança está em ${savingsRate.toFixed(0)}% — risco para seus objetivos de vida.`,
      };
    },

    fitness_inactive: () => ({
      agentResponse: `Sócrates recebeu alerta de Hipócrates: ${(signal.payload as unknown as FitnessInactivePayload).daysInactive} dias sem atividade.`,
      userImpact: `🏃 Hipócrates preocupado: sem treinos esta semana. O corpo é o templo da mente.`,
    }),

    pattern_detected: () => ({
      agentResponse: `Sócrates detectou padrão emergente: ${(signal.payload as unknown as PatternDetectedPayload).pattern}`,
      userImpact: `🦉 Sócrates descobriu um padrão: ${(signal.payload as unknown as PatternDetectedPayload).pattern}`,
    }),
  };

  const handler = handlers[signal.type];
  return handler ? handler() : null;
}

// ──────────────────────────────────────────────
// DETECÇÃO DE PADRÕES EMERGENTES (Sócrates)
// ──────────────────────────────────────────────

function detectEmergingPattern(ctx: LifeContext): string | null {
  const habits = ctx.habits || [];
  const tasks = ctx.tasks || [];
  const fitness = ctx.fitness || {};

  // Padrão: hábitos fortes + tarefas em alta + fitness ok = estado de flow
  const strongHabits = habits.filter((h) => (h.streak ?? 0) >= 7).length;
  const doneTasks = tasks.filter((t) => t.status === 'done').length;
  const activeFitness = (fitness.weeklyActivities ?? 0) >= 3;

  if (strongHabits >= 3 && doneTasks >= 5 && activeFitness) {
    return 'Você está em estado de FLOW: hábitos fortes + alta execução + corpo ativo. Momento ideal para atacar metas audaciosas.';
  }

  // Padrão: tudo parado = burnout ou bloqueio
  const zeroStreaks = habits.filter((h) => h.streak === 0).length;
  const todoTasks = tasks.filter((t) => t.status === 'todo').length;

  if (zeroStreaks >= 3 && todoTasks >= 5 && !activeFitness) {
    return 'Padrão de paralisia detectado: hábitos, tarefas e fitness todos estagnados. Pode indicar sobrecarga ou perda de direção.';
  }

  return null;
}

// ──────────────────────────────────────────────
// IN-MEMORY BUS (dev / sem Supabase)
// ──────────────────────────────────────────────

interface InMemorySignal extends AgentSignal {
  profileId: string;
  timestamp: Date;
}
const inMemoryBus: InMemorySignal[] = [];

export function getInMemorySignals(profileId: string): InMemorySignal[] {
  return inMemoryBus.filter((s) => s.profileId === profileId).slice(-20);
}
