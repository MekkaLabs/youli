/**
 * useInsights — gera insights reais via IA a partir dos dados do usuário
 * Cascade: API Claude → cache AsyncStorage (30min TTL) → fallback local
 */
import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useHabits } from './useHabits';
import { useGoals } from './useGoals';
import { useFinance } from './useFinance';
import { useLifePatterns } from './useLifePatterns';

const API_BASE = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3002';
const CACHE_KEY = '@youli:insights_cache';
const CACHE_TTL_MS = 30 * 60 * 1000; // 30 min

export type InsightType = 'productivity' | 'finance' | 'health' | 'warning' | 'achievement' | 'pattern';

export interface AIInsight {
  id: string;
  title: string;
  content: string;
  type: InsightType;
  energy: 'alta' | 'media' | 'baixa';
  actions: string[];
  agent: string;
  agentEmoji: string;
  score?: number;
  trend?: 'up' | 'down' | 'stable';
}

type HabitsHook = ReturnType<typeof useHabits>;
type GoalsHook = ReturnType<typeof useGoals>;
type HabitItem = HabitsHook['habits'][number];
type GoalItem = GoalsHook['goals'][number];

function buildFallbackInsights(
  habits: HabitsHook,
  goals: GoalsHook,
  patterns: ReturnType<typeof useLifePatterns>,
): AIInsight[] {
  const insights: AIInsight[] = [];

  // Habit streak insight
  const habitsArr: HabitItem[] = habits.habits ?? [];
  const topStreak = habitsArr.reduce<HabitItem | null>(
    (max, h) => (!max || h.streak > max.streak ? h : max),
    null,
  );
  if (topStreak && topStreak.streak >= 3) {
    insights.push({
      id: 'streak-top',
      title: `Série de ${topStreak.streak} dias! 🔥`,
      content: `"${topStreak.title}" está em sequência há ${topStreak.streak} dias. Consistência é o maior diferencial para mudança real.`,
      type: 'achievement',
      energy: 'alta',
      actions: ['Manter o ritmo', 'Adicionar hábito complementar'],
      agent: 'Aristóteles',
      agentEmoji: '📚',
    });
  }

  // Goal progress insight
  const goalsArr: GoalItem[] = goals.goals ?? [];
  const activeGoals = goalsArr.filter((g) => g.status === 'active');
  if (activeGoals.length > 0) {
    const avgProgress =
      activeGoals.reduce((s, g) => s + ((g.currentValue ?? 0) / (g.targetValue || 1)) * 100, 0) /
      activeGoals.length;
    insights.push({
      id: 'goals-avg',
      title: avgProgress >= 60 ? 'Metas no caminho certo' : 'Metas precisam de atenção',
      content: `Progresso médio das suas ${activeGoals.length} metas ativas: ${Math.round(avgProgress)}%. ${avgProgress >= 60 ? 'Continue acelerando!' : 'Considere revisar prioridades.'}`,
      type: avgProgress >= 60 ? 'productivity' : 'warning',
      energy: avgProgress >= 60 ? 'alta' : 'media',
      actions: avgProgress >= 60 ? ['Ver milestones', 'Compartilhar progresso'] : ['Revisar metas', 'Definir próxima ação'],
      agent: 'Sun Tzu',
      agentEmoji: '⚔️',
      score: Math.round(avgProgress),
      trend: avgProgress >= 60 ? 'up' : 'down',
    });
  }

  // Life balance insight from patterns
  if (patterns.lifeBalance !== undefined) {
    insights.push({
      id: 'life-balance',
      title: `Life Balance Score: ${patterns.lifeBalance}/100`,
      content: patterns.lifeBalance >= 70
        ? 'Seu equilíbrio de vida está saudável. Áreas positivas superam as críticas.'
        : 'Algumas áreas de vida precisam de atenção. Foque nas mais impactantes primeiro.',
      type: 'pattern',
      energy: patterns.lifeBalance >= 70 ? 'alta' : 'media',
      actions: ['Ver análise detalhada', 'Ajustar prioridades'],
      agent: 'Sócrates',
      agentEmoji: '🦉',
      score: patterns.lifeBalance,
      trend: patterns.lifeBalance >= 70 ? 'up' : 'stable',
    });
  }

  return insights;
}

export function useInsights() {
  const [insights, setInsights] = useState<AIInsight[]>([]);
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  const habits = useHabits();
  const goals = useGoals();
  const finance = useFinance();
  const patterns = useLifePatterns();

  const loadInsights = useCallback(async (forceRefresh = false) => {
    setLoading(true);
    try {
      // Check cache
      if (!forceRefresh) {
        const cached = await AsyncStorage.getItem(CACHE_KEY);
        if (cached) {
          const { data, timestamp } = JSON.parse(cached);
          if (Date.now() - timestamp < CACHE_TTL_MS) {
            setInsights(data);
            setLastUpdated(new Date(timestamp).toISOString());
            return;
          }
        }
      }

      // Build context for API
      const habitsArr: HabitItem[] = habits.habits ?? [];
      const goalsArr: GoalItem[] = goals.goals ?? [];
      const habitWithCompletedToday = habitsArr as (HabitItem & { completedToday?: boolean })[];
      const financeAny = finance as { totalBalance?: number; monthlyExpenses?: number };
      const context = {
        habits: {
          total: habitsArr.length,
          activeStreaks: habitsArr.filter((h) => h.streak > 0).length,
          topStreak: habitsArr.reduce<HabitItem | null>(
            (max, h) => (!max || h.streak > max.streak ? h : max),
            null,
          ),
          completedToday: habitWithCompletedToday.filter((h) => h.completedToday).length,
        },
        goals: {
          total: goalsArr.length,
          active: goalsArr.filter((g) => g.status === 'active').length,
          avgProgress: goalsArr.length > 0
            ? Math.round(
                goalsArr.reduce(
                  (s, g) => s + ((g.currentValue ?? 0) / (g.targetValue || 1)) * 100,
                  0,
                ) / goalsArr.length,
              )
            : 0,
        },
        finance: {
          totalBalance: financeAny.totalBalance ?? 0,
          monthlyExpenses: financeAny.monthlyExpenses ?? 0,
        },
        lifeBalance: patterns.lifeBalance,
        positivePatterns: patterns.positiveCount,
        warningPatterns: patterns.warningCount,
      };

      const res = await fetch(`${API_BASE}/api/insights`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(context),
      }).catch(() => null);

      if (res?.ok) {
        const { insights: aiInsights } = await res.json();
        if (aiInsights?.length > 0) {
          setInsights(aiInsights);
          const now = Date.now();
          setLastUpdated(new Date(now).toISOString());
          await AsyncStorage.setItem(CACHE_KEY, JSON.stringify({ data: aiInsights, timestamp: now }));
          return;
        }
      }

      // Fallback: generate local insights
      const fallback = buildFallbackInsights(habits, goals, patterns);
      setInsights(fallback);
      setLastUpdated(new Date().toISOString());
    } finally {
      setLoading(false);
    }
  }, [habits, goals, finance, patterns]);

  useEffect(() => {
    loadInsights();
  }, []);

  return { insights, loading, lastUpdated, refresh: () => loadInsights(true) };
}
