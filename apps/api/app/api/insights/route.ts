import { NextResponse } from 'next/server';
import { listInsights } from '@/repositories/store';
import { requireAuth } from '@/lib/http';

type InsightContext = {
  habits?: { total?: number; activeStreaks?: number; completedToday?: number };
  goals?: { active?: number; avgProgress?: number };
  finance?: { totalBalance?: number; monthlyExpenses?: number };
  lifeBalance?: number;
  positivePatterns?: number;
  warningPatterns?: number;
};

export async function GET() {
  const auth = await requireAuth();
  if (auth.error) return auth.response;
  return NextResponse.json(await listInsights(auth.user.id));
}

export async function POST(req: Request) {
  const context = (await req.json().catch(() => ({}))) as InsightContext;
  const habits = context.habits ?? {};
  const goals = context.goals ?? {};
  const finance = context.finance ?? {};
  const lifeBalance = context.lifeBalance ?? 65;

  const insights = [
    {
      id: `ins-${Date.now()}-1`,
      title: 'Ritmo de execução',
      content: `Você concluiu ${habits.completedToday ?? 0} hábitos hoje; com ${goals.active ?? 0} metas ativas, priorize uma entrega crítica agora.`,
      type: 'productivity',
      energy: lifeBalance >= 70 ? 'alta' : 'media',
      actions: ['Escolher 1 tarefa principal', 'Bloquear 60min de foco'],
      agent: 'Sun Tzu',
      agentEmoji: '⚔️',
      score: Math.max(40, Math.min(95, Math.round((goals.avgProgress ?? 50)))),
      trend: (goals.avgProgress ?? 0) >= 60 ? 'up' : 'stable'
    },
    {
      id: `ins-${Date.now()}-2`,
      title: 'Saúde financeira do mês',
      content: `Saldo atual ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(finance.totalBalance ?? 0)} e gasto mensal de ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(finance.monthlyExpenses ?? 0)}.`,
      type: 'finance',
      energy: 'media',
      actions: ['Revisar gastos variáveis', 'Definir teto semanal'],
      agent: 'Adam Smith',
      agentEmoji: '💰',
      score: 72,
      trend: 'stable'
    },
    {
      id: `ins-${Date.now()}-3`,
      title: 'Equilíbrio sistêmico',
      content: `Life balance em ${lifeBalance}/100, com ${context.positivePatterns ?? 0} sinais positivos e ${context.warningPatterns ?? 0} alertas.`,
      type: (context.warningPatterns ?? 0) > 2 ? 'warning' : 'pattern',
      energy: lifeBalance >= 70 ? 'alta' : 'baixa',
      actions: ['Atuar no maior gargalo', 'Reavaliar plano semanal'],
      agent: 'Sócrates',
      agentEmoji: '🦉',
      score: lifeBalance,
      trend: lifeBalance >= 70 ? 'up' : 'down'
    }
  ];

  return NextResponse.json({ insights, generatedAt: new Date().toISOString() });
}
