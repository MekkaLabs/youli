/**
 * useHabits — hook de estado dos hábitos com persistência AsyncStorage
 * Gerencia: check/uncheck, cálculo de streak, datas completadas, milestone detection
 */

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getMilestone } from '../molecules/StreakMilestone';
import { AppState, AppStateStatus } from 'react-native';
const API_BASE = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3002';
const SYNC_INTERVAL_MS = 20000;

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

import { ApiHabitSchema, type ApiHabit } from '../types/api-schemas';

function fromApiHabit(raw: unknown): HabitData {
  const parsed = ApiHabitSchema.safeParse(raw);
  const h: ApiHabit = parsed.success
    ? parsed.data
    : ({ id: `h_${Date.now()}`, title: 'Hábito', streak: 0 } as ApiHabit);
  const palette = ['#059669', '#7C3AED', '#D97706', '#DC2626', '#0891B2'];
  const idDigest = h.id.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  return {
    id: h.id,
    title: h.title || 'Hábito',
    emoji: '🏛️',
    color: palette[Math.abs(idDigest) % palette.length],
    frequency: h.frequency === 'weekly' ? 'weekly' : 'daily',
    category: 'Mente',
    streak: h.streak ?? 0,
    bestStreak: h.streak ?? 0,
    completedDates: [],
    createdAt: new Date().toISOString(),
  };
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
  const [syncing, setSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [lastSyncAt, setLastSyncAt] = useState<string | null>(null);
  const isSyncingRef = useRef(false);

  const loadFromStorage = useCallback(async () => {
    if (isSyncingRef.current) return;
    isSyncingRef.current = true;
    setSyncing(true);
    setSyncError(null);
    const api = await fetch(`${API_BASE}/api/habits`).catch(() => null);
    if (api?.ok) {
      const list = await api.json().catch(() => []);
      const mapped = (Array.isArray(list) ? list : []).map(fromApiHabit);
      setHabits(mapped);
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(mapped));
      setLastSyncAt(new Date().toISOString());
      setSyncing(false);
      setLoading(false);
      isSyncingRef.current = false;
      return;
    }
    setSyncError('offline');
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
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
      setSyncing(false);
      setLoading(false);
      isSyncingRef.current = false;
  }, []);

  // Carrega do storage + sincroniza entre abas/telas
  useEffect(() => {
    loadFromStorage();
    const timer = setInterval(loadFromStorage, SYNC_INTERVAL_MS);
    const sub = AppState.addEventListener('change', (state: AppStateStatus) => {
      if (state === 'active') {
        loadFromStorage();
      }
    });
    return () => {
      clearInterval(timer);
      sub.remove();
    };
  }, [loadFromStorage]);

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
    fetch(`${API_BASE}/api/habits`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ id: habitId, action: 'checkin' }),
    }).then(() => loadFromStorage()).catch(() => null);
  }, [loadFromStorage]);

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
    fetch(`${API_BASE}/api/habits`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ title: habit.title }),
    }).then(() => loadFromStorage()).catch(() => null);
  }, [loadFromStorage]);

  const restoreHabit = useCallback((habit: HabitData) => {
    setHabits(prev => {
      const next = [habit, ...prev.filter((h) => h.id !== habit.id)];
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
    fetch(`${API_BASE}/api/habits`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ title: habit.title }),
    }).then(() => loadFromStorage()).catch(() => null);
  }, [loadFromStorage]);


  const deleteHabit = useCallback((id: string) => {
    setHabits(prev => {
      const updated = prev.filter(h => h.id !== id);
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
    fetch(`${API_BASE}/api/habits`, {
      method: 'DELETE',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ id }),
    }).then(() => loadFromStorage()).catch(() => null);
  }, [loadFromStorage]);

  const editHabit = useCallback((id: string, patch: Partial<Pick<HabitData, 'title' | 'emoji' | 'color' | 'category' | 'frequency'>>) => {
    setHabits(prev => {
      const updated = prev.map(h => h.id === id ? { ...h, ...patch } : h);
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  // Stats gerais — memoized to prevent recomputation on unrelated state changes
  const stats = useMemo(() => ({
    total: habits.length,
    completedToday: habits.filter(isCompletedToday).length,
    longestStreak: habits.length ? Math.max(...habits.map((h) => h.streak), 0) : 0,
    bestEver: habits.length ? Math.max(...habits.map((h) => h.bestStreak), 0) : 0,
    totalCompletions: habits.reduce((s, h) => s + h.completedDates.length, 0),
    strongHabits: habits.filter((h) => h.streak >= 7).length,
    categorySummary: habits.reduce<Record<string, number>>((acc, h) => {
      acc[h.category] = (acc[h.category] ?? 0) + 1;
      return acc;
    }, {}),
  }), [habits]);

  return {
    habits,
    loading,
    syncing,
    syncError,
    lastSyncAt,
    stats,
    milestone,
    toggleToday,
    dismissMilestone,
    addHabit,
    restoreHabit,
    deleteHabit,
    editHabit,
    isCompletedToday,
    refresh: loadFromStorage
  };
}
