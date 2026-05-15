/**
 * useLifePatterns — detecta correlações e padrões cross-área
 *
 * Analisa conexões entre:
 * - Hábitos consistentes → metas avançando mais rápido
 * - Gastos elevados → taxa de poupança em risco
 * - Inatividade em hábitos → metas estagnadas
 * - Streaks fortes → momentum positivo em todas as áreas
 */

import { useMemo } from 'react';
import { useHabits } from './useHabits';
import { useGoals } from './useGoals';
import { useFinance } from './useFinance';

export type PatternSeverity = 'positive' | 'warning' | 'critical' | 'info';

export interface LifePattern {
  id: string;
  title: string;
  description: string;
  severity: PatternSeverity;
  areas: Array<'habitos' | 'metas' | 'financeiro' | 'produtividade'>;
  agent: string;
  agentEmoji: string;
  color: string;
  actionLabel?: string;
  actionScreen?: string;
  score: number; // 0-100 relevância
}

const SEVERITY_COLOR: Record<PatternSeverity, string> = {
  positive: '#059669',
  warning: '#D97706',
  critical: '#DC2626',
  info: '#7C3AED',
};

export function useLifePatterns() {
  const { habits, stats: habitStats, isCompletedToday } = useHabits();
  const { goals, goalStatus, progressPercent } = useGoals();
  const { monthlySummary, categoryBreakdown } = useFinance();

  const patterns = useMemo((): LifePattern[] => {
    const result: LifePattern[] = [];

    // ── 1. Momentum positivo: streak alto + progresso de meta acelerado ──
    const strongHabits = habits.filter(h => h.streak >= 7);
    const activeGoals = goals.filter(g => goalStatus(g) === 'active');

    if (strongHabits.length >= 2 && activeGoals.length > 0) {
      result.push({
        id: 'momentum_positive',
        title: '🚀 Momentum em alta',
        description: `${strongHabits.length} hábitos com streak ≥7 dias. Aristóteles detecta que sua consistência está acelerando o progresso das metas.`,
        severity: 'positive',
        areas: ['habitos', 'metas'],
        agent: 'Aristóteles',
        agentEmoji: '🏛️',
        color: SEVERITY_COLOR.positive,
        score: 90,
      });
    }

    // ── 2. Hábitos fracos + metas estagnadas ──────────────────────────
    const weakHabits = habits.filter(h => h.streak === 0 && !isCompletedToday(h));
    const stalledGoals = goals.filter(g => goalStatus(g) === 'at_risk');

    if (weakHabits.length >= 2 && stalledGoals.length >= 1) {
      result.push({
        id: 'habit_goal_stall',
        title: '⚠️ Padrão de estagnação',
        description: `${weakHabits.length} hábitos sem streak e ${stalledGoals.length} ${stalledGoals.length === 1 ? 'meta em risco' : 'metas em risco'}. Alexandre e Aristóteles concordam: retomar os hábitos é o caminho mais curto para as metas.`,
        severity: 'warning',
        areas: ['habitos', 'metas'],
        agent: 'Aristóteles',
        agentEmoji: '🏛️',
        color: SEVERITY_COLOR.warning,
        actionLabel: 'Ver hábitos',
        actionScreen: '/(tabs)/habitos',
        score: 88,
      });
    }

    // ── 3. Gastos altos + meta financeira em risco ────────────────────
    const financialGoals = goals.filter(g =>
      g.category === 'financeiro' && goalStatus(g) !== 'completed'
    );
    const topSpendCat = categoryBreakdown[0];

    if (monthlySummary.savingsRate < 15 && financialGoals.length > 0) {
      result.push({
        id: 'spend_goal_risk',
        title: '💸 Gastos sabotando suas metas',
        description: `Taxa de poupança em ${monthlySummary.savingsRate}%${topSpendCat ? ` — maior gasto: ${topSpendCat.emoji} ${topSpendCat.name} (${topSpendCat.percent}%)` : ''}. Adam Smith alerta: suas metas financeiras estão em risco com esse ritmo.`,
        severity: monthlySummary.savingsRate < 5 ? 'critical' : 'warning',
        areas: ['financeiro', 'metas'],
        agent: 'Adam Smith',
        agentEmoji: '💰',
        color: monthlySummary.savingsRate < 5 ? SEVERITY_COLOR.critical : SEVERITY_COLOR.warning,
        actionLabel: 'Ver financeiro',
        actionScreen: '/(tabs)/financeiro',
        score: 85,
      });
    }

    // ── 4. Poupança saudável + meta financeira no caminho ────────────
    if (monthlySummary.savingsRate >= 20 && financialGoals.length > 0) {
      const bestFinGoal = financialGoals.sort(
        (a, b) => progressPercent(b.currentValue, b.targetValue) - progressPercent(a.currentValue, a.targetValue)
      )[0];
      result.push({
        id: 'saving_momentum',
        title: '💰 Poupança em ritmo excelente',
        description: `${monthlySummary.savingsRate}% de taxa de poupança. Adam Smith projeta que "${bestFinGoal.title}" será atingida antes do prazo se mantiver esse ritmo.`,
        severity: 'positive',
        areas: ['financeiro', 'metas'],
        agent: 'Adam Smith',
        agentEmoji: '💰',
        color: SEVERITY_COLOR.positive,
        score: 80,
      });
    }

    // ── 5. Completude diária alta → insight de produtividade ─────────
    const completionRate = habitStats.total > 0
      ? Math.round((habitStats.completedToday / habitStats.total) * 100)
      : 0;

    if (completionRate >= 80 && habitStats.total >= 3) {
      result.push({
        id: 'daily_excellence',
        title: `✨ ${completionRate}% dos hábitos hoje`,
        description: 'Dias com alta conclusão de hábitos correlacionam com melhor foco e menor procrastinação. Marco Aurélio observa: você está vivendo em acordo com seus valores.',
        severity: 'positive',
        areas: ['habitos', 'produtividade'],
        agent: 'Marco Aurélio',
        agentEmoji: '👑',
        color: SEVERITY_COLOR.positive,
        score: 75,
      });
    }

    // ── 6. Desequilíbrio: só financeiro, hábitos negligenciados ──────
    if (monthlySummary.savingsRate >= 10 && weakHabits.length >= 3) {
      result.push({
        id: 'imbalance_finance_habits',
        title: '⚖️ Desequilíbrio detectado',
        description: `Você está bem financeiramente (${monthlySummary.savingsRate}% poupança) mas ${weakHabits.length} hábitos estão negligenciados. Riqueza sem saúde e propósito é incompleta.`,
        severity: 'info',
        areas: ['habitos', 'financeiro'],
        agent: 'Marco Aurélio',
        agentEmoji: '👑',
        color: SEVERITY_COLOR.info,
        actionLabel: 'Ver hábitos',
        actionScreen: '/(tabs)/habitos',
        score: 70,
      });
    }

    // ── 7. Recordes de streak → insight histórico ─────────────────────
    const recordHabits = habits.filter(h => h.streak > 0 && h.streak === h.bestStreak && h.streak >= 14);
    if (recordHabits.length > 0) {
      const top = recordHabits.sort((a, b) => b.streak - a.streak)[0];
      result.push({
        id: 'streak_record',
        title: `🏆 Recorde pessoal: ${top.emoji} ${top.streak} dias`,
        description: `"${top.title}" está no seu maior streak histórico. Aristóteles reconhece: você está transcendendo seus próprios limites.`,
        severity: 'positive',
        areas: ['habitos'],
        agent: 'Aristóteles',
        agentEmoji: '🏛️',
        color: SEVERITY_COLOR.positive,
        score: 65,
      });
    }

    // Ordena por score (mais relevante primeiro)
    return result.sort((a, b) => b.score - a.score);
  }, [habits, goals, monthlySummary, categoryBreakdown, habitStats, isCompletedToday, goalStatus, progressPercent]);

  // Score geral de equilíbrio de vida (0-100)
  const lifeBalance = useMemo(() => {
    const positives = patterns.filter(p => p.severity === 'positive').length;
    const warnings = patterns.filter(p => p.severity === 'warning').length;
    const criticals = patterns.filter(p => p.severity === 'critical').length;

    const base = 70;
    const score = Math.min(100, Math.max(0,
      base + (positives * 10) - (warnings * 8) - (criticals * 15)
    ));
    return score;
  }, [patterns]);

  const positiveCount = patterns.filter(p => p.severity === 'positive').length;
  const warningCount = patterns.filter(p => p.severity !== 'positive').length;

  return { patterns, lifeBalance, positiveCount, warningCount };
}
