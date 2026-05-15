/**
 * useHabits — hook de estado dos hábitos com persistência AsyncStorage
 * Gerencia: check/uncheck, cálculo de streak, datas completadas, milestone detection
 */

import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getMilestone } from '../molecules/StreakMilestone';

export interface HabitData {
  id: string;
  title: string;
  emoji: string;
  color: string;
  frequency: 'daily' | 'weekly';
  category: string;
  streak: number;
  bestStreak: number;
  completedDates: string[]; // ISO 'YYYY-MM-DD'
  createdAt: string;
}

const STORAGE_KEY = '@youli:habits';

function todayISO(): string {
  return new Date().toISOString().split('T')[0];
}

function isCompletedToday(habit: HabitData): boolean {
  return habit.completedDates.includes(todayISO());
}

function calculateStreak(completedDates: string[]): number {
  if (!completedDates.length) return 0;
  const sorted = [...completedDates].sort((a, b) => b.localeCompare(a));
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let streak = 0;
  let cursor = new Date(today);

  for (const date of sorted) {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    const diff = Math.round((cursor.getTime() - d.getTime()) / 86400000);

    if (diff === 0 || diff === 1) {
      streak++;
      cursor = d;
    } else {
      break;
    }
  }
  return streak;
}

// Hábitos padrão de demonstração
const DEFAULT_HABITS: HabitData[] = [
  {
    id: '1',
    title: 'Meditar 10 minutos',
    emoji: '🧘',
    color: '#059669',
    frequency: 'daily',
    category: 'Mente',
    streak: 5,
    bestStreak: 12,
    completedDates: generateDemoCompletions(5),
    createdAt: new Date(Date.now() - 30 * 86400000).toISOString(),
  },
  {
    id: '2',
    title: 'Ler 20 páginas',
    emoji: '📚',
    color: '#7C3AED',
    frequency: 'daily',
    category: 'Aprendizado',
    streak: 3,
    bestStreak: 8,
    completedDates: generateDemoCompletions(3),
    createdAt: new Date(Date.now() - 20 * 86400000).toISOString(),
  },
  {
    id: '3',
    title: 'Exercitar 30 min',
    emoji: '🏃',
    color: '#D97706',
    frequency: 'daily',
    category: 'Corpo',
    streak: 7,
    bestStreak: 7,
    completedDates: generateDemoCompletions(7),
    createdAt: new Date(Date.now() - 14 * 86400000).toISOString(),
  },
  {
    id: '4',
    title: 'Beber 2L de água',
    emoji: '💧',
    color: '#0891B2',
    frequency: 'daily',
    category: 'Corpo',
    streak: 14,
    bestStreak: 21,
    completedDates: generateDemoCompletions(14),
    createdAt: new Date(Date.now() - 40 * 86400000).toISOString(),
  },
  {
    id: '5',
    title: 'Planejar o dia seguinte',
    emoji: '📋',
    color: '#DC2626',
    frequency: 'daily',
    category: 'Produtividade',
    streak: 2,
    bestStreak: 10,
    completedDates: generateDemoCompletions(2),
    createdAt: new Date(Date.now() - 25 * 86400000).toISOString(),
  },
  {
    id: '6',
    title: 'Gratidão — 3 itens',
    emoji: '🙏',
    color: '#B45309',
    frequency: 'daily',
    category: 'Mente',
    streak: 21,
    bestStreak: 21,
    completedDates: generateDemoCompletions(21),
    createdAt: new Date(Date.now() - 60 * 86400000).toISOString(),
  },
];

function generateDemoCompletions(streakDays: number): string[] {
  const dates: string[] = [];
  for (let i = 0; i < streakDays; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    dates.push(d.toISOString().split('T')[0]);
  }
  // Adiciona algumas completions históricas aleatórias para o calendário parecer rico
  for (let i = streakDays + 2; i < streakDays + 30; i++) {
    if (Math.random() > 0.35) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      dates.push(d.toISOString().split('T')[0]);
    }
  }
  return dates;
}

export interface MilestoneAlert {
  habitId: string;
  habitTitle: string;
  streak: number;
  color: string;
}

export function useHabits() {
  const [habits, setHabits] = useState<HabitData[]>([]);
  const [loading, setLoading] = useState(true);
  const [milestone, setMilestone] = useState<MilestoneAlert | null>(null);

  // Carrega do storage
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((raw) => {
      if (raw) {
        try {
          setHabits(JSON.parse(raw));
        } catch {
          setHabits(DEFAULT_HABITS);
        }
      } else {
        setHabits(DEFAULT_HABITS);
        AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_HABITS));
      }
      setLoading(false);
    });
  }, []);

  // Salva quando muda
  const save = useCallback((updated: HabitData[]) => {
    setHabits(updated);
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  }, []);

  // Toggle check do dia
  const toggleToday = useCallback((habitId: string) => {
    setHabits((prev) => {
      const updated = prev.map((h) => {
        if (h.id !== habitId) return h;

        const today = todayISO();
        const alreadyDone = h.completedDates.includes(today);

        let newDates: string[];
        if (alreadyDone) {
          newDates = h.completedDates.filter((d) => d !== today);
        } else {
          newDates = [...h.completedDates, today];
        }

        const newStreak = calculateStreak(newDates);
        const newBest = Math.max(h.bestStreak, newStreak);

        // Verifica marco
        if (!alreadyDone && getMilestone(newStreak)) {
          setMilestone({
            habitId,
            habitTitle: h.title,
            streak: newStreak,
            color: h.color,
          });
        }

        return {
          ...h,
          completedDates: newDates,
          streak: newStreak,
          bestStreak: newBest,
        };
      });

      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  const dismissMilestone = useCallback(() => setMilestone(null), []);

  // Adicionar novo hábito
  const addHabit = useCallback((habit: Omit<HabitData, 'id' | 'streak' | 'bestStreak' | 'completedDates' | 'createdAt'>) => {
    const newHabit: HabitData = {
      ...habit,
      id: Date.now().toString(),
      streak: 0,
      bestStreak: 0,
      completedDates: [],
      createdAt: new Date().toISOString(),
    };
    setHabits((prev) => {
      const updated = [...prev, newHabit];
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);


  const deleteHabit = useCallback((id: string) => {
    setHabits(prev => {
      const updated = prev.filter(h => h.id !== id);
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  const editHabit = useCallback((id: string, patch: Partial<Pick<HabitData, 'title' | 'emoji' | 'color' | 'category' | 'frequency'>>) => {
    setHabits(prev => {
      const updated = prev.map(h => h.id === id ? { ...h, ...patch } : h);
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  // Stats gerais
  const stats = {
    total: habits.length,
    completedToday: habits.filter(isCompletedToday).length,
    longestStreak: Math.max(...habits.map((h) => h.streak), 0),
    bestEver: Math.max(...habits.map((h) => h.bestStreak), 0),
    totalCompletions: habits.reduce((s, h) => s + h.completedDates.length, 0),
    strongHabits: habits.filter((h) => h.streak >= 7).length,
    categorySummary: habits.reduce<Record<string, number>>((acc, h) => {
      acc[h.category] = (acc[h.category] ?? 0) + 1;
      return acc;
    }, {}),
  };

  return {
    habits,
    loading,
    stats,
    milestone,
    toggleToday,
    dismissMilestone,
    addHabit,
    isCompletedToday,
  };
}
