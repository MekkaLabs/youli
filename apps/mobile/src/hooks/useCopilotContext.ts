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
    const habitsArr = (habits as any).habits ?? [];
    const goalsArr = (goals as any).goals ?? [];
    const healthData = (health as any).data;

    const topStreak = habitsArr.reduce(
      (max: any, h: any) => (!max || h.streak > max.streak ? h : max), null
    );
    const activeGoals = goalsArr.filter((g: any) => g.status === 'active');
    const nearestGoal = activeGoals.sort((a: any, b: any) => {
      const dA = a.deadline ? new Date(a.deadline).getTime() - Date.now() : Infinity;
      const dB = b.deadline ? new Date(b.deadline).getTime() - Date.now() : Infinity;
      return dA - dB;
    })[0] ?? null;

    const hour = new Date().getHours();
    const timeOfDay = hour < 12 ? 'morning' : hour < 18 ? 'afternoon' : 'evening';

    return {
      user: {
        name: profile.name,
        orchestratorName: profile.orchestratorName,
        level: xpData.level,
        xp: xpData.total,
      },
      habits: {
        total: habitsArr.length,
        completedToday: habitsArr.filter((h: any) => h.completedToday).length,
        topStreak: topStreak ? { title: topStreak.title, streak: topStreak.streak } : null,
        avgStreak: habitsArr.length
          ? Math.round(habitsArr.reduce((s: number, h: any) => s + (h.streak ?? 0), 0) / habitsArr.length)
          : 0,
      },
      goals: {
        total: goalsArr.length,
        active: activeGoals.length,
        avgProgress: activeGoals.length
          ? Math.round(activeGoals.reduce((s: number, g: any) => s + (g.progress ?? 0), 0) / activeGoals.length)
          : 0,
        nearest: nearestGoal ? {
          title: nearestGoal.title,
          progress: nearestGoal.progress ?? 0,
          daysLeft: nearestGoal.deadline
            ? Math.ceil((new Date(nearestGoal.deadline).getTime() - Date.now()) / 86400000)
            : 999,
        } : null,
      },
      tasks: {
        todo: counts.todo,
        doing: counts.doing,
        done: counts.done,
        todayCount: tasks.filter(t => {
          if (!t.dueDate) return t.status === 'doing';
          return new Date(t.dueDate).toDateString() === new Date().toDateString();
        }).length,
      },
      finance: {
        balance: (finance as any).totalBalance ?? 0,
        monthlyExpenses: (finance as any).thisMonth?.expenses ?? 0,
        savings: (finance as any).thisMonth?.savings ?? 0,
      },
      health: {
        steps: healthData?.steps ?? 0,
        sleepHours: healthData?.sleepHours ?? 0,
        activeCalories: healthData?.activeCalories ?? 0,
      },
      lifeBalance: patterns.lifeBalance ?? 70,
      positivePatterns: patterns.positiveCount ?? 0,
      warningPatterns: patterns.warningCount ?? 0,
      date: new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' }),
      timeOfDay,
    };
  }, [profile, habits, goals, tasks, counts, finance, health, patterns, xpData]);
}
