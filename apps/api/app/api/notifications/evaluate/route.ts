/**
 * POST /api/notifications/evaluate
 * Recebe contexto do usuário e retorna notificações a disparar
 * O mobile chama isso a cada hora (background fetch) ou ao abrir o app
 */
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface EvaluateContext {
  habits: Array<{
    id: string;
    title: string;
    streak: number;
    doneToday: boolean;
    emoji: string;
  }>;
  goals: Array<{
    id: string;
    title: string;
    progress: number;        // 0-100
    daysUntilDeadline: number;
    nextMilestoneAt?: number; // % do próximo milestone
    status: string;
    emoji: string;
  }>;
  finance: {
    savingsRate: number;      // %
    todaySpend: number;
    avgDailySpend7d: number;
  };
  tasks: {
    lastCompletedHoursAgo: number;
    completedToday: number;
  };
  lastNotifications?: Record<string, string>; // type → ISO timestamp do último disparo
}

interface SmartNotification {
  id: string;
  type: string;
  title: string;
  body: string;
  agent: string;
  agentEmoji: string;
  color: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  scheduledFor?: string; // ISO — se omitido, dispara imediatamente
  data?: Record<string, string>;
}

function cooldownOk(type: string, hours: number, last?: Record<string, string>): boolean {
  if (!last?.[type]) return true;
  const diff = (Date.now() - new Date(last[type]).getTime()) / 3_600_000;
  return diff >= hours;
}

export async function POST(req: Request) {
  try {
    const ctx: EvaluateContext = await req.json();
    const notifications: SmartNotification[] = [];
    const last = ctx.lastNotifications ?? {};

    // ── Hábitos: streak em risco ──────────────────────────────────────
    if (cooldownOk('habit_streak_risk', 24, last)) {
      const atRisk = ctx.habits.filter(h => !h.doneToday && h.streak >= 3);
      if (atRisk.length > 0) {
        const top = atRisk.sort((a, b) => b.streak - a.streak)[0];
        notifications.push({
          id: `habit_risk_${top.id}`,
          type: 'habit_streak_risk',
          title: `${top.emoji} Streak em risco! ${top.streak} dias`,
          body: `Não quebre agora — complete "${top.title}" antes da meia-noite.`,
          agent: 'Aristóteles',
          agentEmoji: '🏛️',
          color: '#059669',
          priority: 'high',
          data: { habitId: top.id, screen: '/(tabs)/habitos' },
        });
      }
    }

    // ── Metas: deadline próxima ───────────────────────────────────────
    if (cooldownOk('goal_deadline', 48, last)) {
      const urgent = ctx.goals.filter(
        g => g.daysUntilDeadline <= 7 && g.progress < 80 && g.status !== 'completed'
      );
      if (urgent.length > 0) {
        const top = urgent.sort((a, b) => a.daysUntilDeadline - b.daysUntilDeadline)[0];
        notifications.push({
          id: `goal_deadline_${top.id}`,
          type: 'goal_deadline',
          title: `${top.emoji} ${top.daysUntilDeadline}d para o prazo — ${top.progress}% concluído`,
          body: `"${top.title}" precisa de atenção urgente. Alexandre está monitorando.`,
          agent: 'Alexandre',
          agentEmoji: '⚔️',
          color: '#DC2626',
          priority: 'critical',
          data: { goalId: top.id, screen: '/(tabs)/metas' },
        });
      }
    }

    // ── Milestone próximo ─────────────────────────────────────────────
    if (cooldownOk('milestone_near', 12, last)) {
      const nearMilestone = ctx.goals.find(
        g => g.nextMilestoneAt !== undefined && g.progress >= (g.nextMilestoneAt - 10)
          && g.progress < g.nextMilestoneAt
      );
      if (nearMilestone) {
        notifications.push({
          id: `milestone_${nearMilestone.id}`,
          type: 'milestone_near',
          title: `${nearMilestone.emoji} Quase lá! ${10 - Math.round(nearMilestone.nextMilestoneAt! - nearMilestone.progress)}% para o próximo marco`,
          body: `"${nearMilestone.title}" está a um passo do milestone. Não pare agora!`,
          agent: 'Alexandre',
          agentEmoji: '⚔️',
          color: '#7C3AED',
          priority: 'medium',
          data: { goalId: nearMilestone.id, screen: '/(tabs)/metas' },
        });
      }
    }

    // ── Finanças: anomalia de gasto ───────────────────────────────────
    if (cooldownOk('finance_anomaly', 24, last) && ctx.finance.avgDailySpend7d > 0) {
      const ratio = ctx.finance.todaySpend / ctx.finance.avgDailySpend7d;
      if (ratio > 1.5) {
        notifications.push({
          id: 'finance_anomaly',
          type: 'finance_anomaly',
          title: `💸 Gasto ${Math.round((ratio - 1) * 100)}% acima da média hoje`,
          body: `Você gastou R$ ${ctx.finance.todaySpend.toFixed(0)} — sua média é R$ ${ctx.finance.avgDailySpend7d.toFixed(0)}/dia.`,
          agent: 'Adam Smith',
          agentEmoji: '💰',
          color: '#0891B2',
          priority: 'medium',
          data: { screen: '/(tabs)/financeiro' },
        });
      }
    }

    // ── Finanças: poupança caiu ───────────────────────────────────────
    if (cooldownOk('savings_drop', 72, last) && ctx.finance.savingsRate < 10) {
      notifications.push({
        id: 'savings_drop',
        type: 'savings_drop',
        title: `📉 Taxa de poupança em ${ctx.finance.savingsRate}%`,
        body: 'Abaixo do mínimo recomendado de 10%. Adam Smith sugere revisar os gastos.',
        agent: 'Adam Smith',
        agentEmoji: '💰',
        color: '#0891B2',
        priority: 'high',
        data: { screen: '/(tabs)/financeiro' },
      });
    }

    // ── Inatividade ───────────────────────────────────────────────────
    if (cooldownOk('inactivity', 48, last) && ctx.tasks.lastCompletedHoursAgo >= 48) {
      notifications.push({
        id: 'inactivity',
        type: 'inactivity',
        title: '⚡ 48h sem tarefas concluídas',
        body: 'Franklin nota uma pausa longa. Uma pequena vitória hoje reativa o momentum.',
        agent: 'Franklin',
        agentEmoji: '🦅',
        color: '#D97706',
        priority: 'medium',
        data: { screen: '/(tabs)/tarefas' },
      });
    }

    // ── Momentum positivo ─────────────────────────────────────────────
    if (cooldownOk('habit_chain', 24, last)) {
      const doneCount = ctx.habits.filter(h => h.doneToday).length;
      if (doneCount >= 3) {
        notifications.push({
          id: 'habit_chain',
          type: 'habit_chain',
          title: `🏆 ${doneCount} hábitos concluídos hoje!`,
          body: 'Você está no modo campeão. Aristóteles reconhece a excelência.',
          agent: 'Aristóteles',
          agentEmoji: '🏛️',
          color: '#059669',
          priority: 'low',
          data: { screen: '/(tabs)/habitos' },
        });
      }
    }

    // Ordena por prioridade
    const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    notifications.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

    return NextResponse.json({
      notifications,
      evaluatedAt: new Date().toISOString(),
      count: notifications.length,
    });
  } catch (error) {
    return NextResponse.json({ notifications: [], count: 0, error: String(error) }, { status: 500 });
  }
}
