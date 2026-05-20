/**
 * useCopilotContext — monta o contexto real do usuário para injetar no Copilot
 * Agrega dados de habits, goals, tasks, finance, health, patterns
 */
import { useMemo } from 'react';
import { useHabits } from './useHabits';
import { useGoals } from './useGoals';
import { useTasks } from './useTasks';
import { useFinance } from './useFinance';
import { useHealth } from './useHealth';
import { useLifePatterns } from './useLifePatterns';
import { useXP } from './useXP';
import { useProfile } from '../store';

export interface CopilotUserContext {
  user: { name: string; orchestratorName: string; level: number; xp: number };
  habits: { total: number; completedToday: number; topStreak: { title: string; streak: number } | null; avgStreak: number };
  goals: { total: number; active: number; avgProgress: number; nearest: { title: string; progress: number; daysLeft: number } | null };
  tasks: { todo: number; doing: number; done: number; todayCount: number };
  finance: { balance: number; monthlyExpenses: number; savings: number };
  health: { steps: number; sleepHours: number; activeCalories: number };
  lifeBalance: number;
  positivePatterns: number;
  warningPatterns: number;
  date: string;
  timeOfDay: 'morning' | 'afternoon' | 'evening';
}

export function useCopilotContext(): CopilotUserContext {
  const { profile } = useProfile();
  const habits = useHabits();
  const goals = useGoals();
  const { tasks, counts } = useTasks();
  const finance = useFinance();
  const health = useHealth();
  const patterns = useLifePatterns();
  const { xpData } = useXP();

  return useMemo(() => {
    type HabitItem = (typeof habits)['habits'][number] & { completedToday?: boolean };
    type GoalItem = (typeof goals)['goals'][number];

    const habitsArr: HabitItem[] = (habits.habits ?? []) as HabitItem[];
    const goalsArr: GoalItem[] = goals.goals ?? [];
    const financeAny = finance as {
      totalBalance?: number;
      thisMonth?: { expenses?: number; savings?: number };
    };
    const healthSummary = (health as { summary?: { steps?: number; sleepHours?: number; activeCalories?: number } }).summary;

    const topStreak = habitsArr.reduce<HabitItem | null>(
      (max, h) => (!max || h.streak > max.streak ? h : max),
      null,
    );
    const activeGoals = goalsArr.filter((g) => g.status === 'active');
    const nearestGoal: GoalItem | null = [...activeGoals].sort((a, b) => {
      const dA = a.deadline ? new Date(a.deadline).getTime() - Date.now() : Infinity;
      const dB = b.deadline ? new Date(b.deadline).getTime() - Date.now() : Infinity;
      return dA - dB;
    })[0] ?? null;

    const hour = new Date().getHours();
    const timeOfDay: 'morning' | 'afternoon' | 'evening' =
      hour < 12 ? 'morning' : hour < 18 ? 'afternoon' : 'evening';

    const goalProgress = (g: GoalItem) =>
      Math.round(((g.currentValue ?? 0) / (g.targetValue || 1)) * 100);

    return {
      user: {
        name: profile.name,
        orchestratorName: profile.orchestratorName,
        level: xpData.level,
        xp: xpData.total,
      },
      habits: {
        total: habitsArr.length,
        completedToday: habitsArr.filter((h) => h.completedToday).length,
        topStreak: topStreak ? { title: topStreak.title, streak: topStreak.streak } : null,
        avgStreak: habitsArr.length
          ? Math.round(habitsArr.reduce((s, h) => s + (h.streak ?? 0), 0) / habitsArr.length)
          : 0,
      },
      goals: {
        total: goalsArr.length,
        active: activeGoals.length,
        avgProgress: activeGoals.length
          ? Math.round(activeGoals.reduce((s, g) => s + goalProgress(g), 0) / activeGoals.length)
          : 0,
        nearest: nearestGoal
          ? {
              title: nearestGoal.title,
              progress: goalProgress(nearestGoal),
              daysLeft: nearestGoal.deadline
                ? Math.ceil((new Date(nearestGoal.deadline).getTime() - Date.now()) / 86400000)
                : 999,
            }
          : null,
      },
      tasks: {
        todo: counts.todo,
        doing: counts.doing,
        done: counts.done,
        todayCount: tasks.filter((t) => {
          const due = (t as { dueDate?: string; dueAt?: string }).dueDate ?? (t as { dueAt?: string }).dueAt;
          if (!due) return t.status === 'doing';
          return new Date(due).toDateString() === new Date().toDateString();
        }).length,
      },
      finance: {
        balance: financeAny.totalBalance ?? 0,
        monthlyExpenses: financeAny.thisMonth?.expenses ?? 0,
        savings: financeAny.thisMonth?.savings ?? 0,
      },
      health: {
        steps: healthSummary?.steps ?? 0,
        sleepHours: healthSummary?.sleepHours ?? 0,
        activeCalories: healthSummary?.activeCalories ?? 0,
      },
      lifeBalance: patterns.lifeBalance ?? 70,
      positivePatterns: patterns.positiveCount ?? 0,
      warningPatterns: patterns.warningCount ?? 0,
      date: new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' }),
      timeOfDay,
    };
  }, [profile, habits, goals, tasks, counts, finance, health, patterns, xpData]);
}
