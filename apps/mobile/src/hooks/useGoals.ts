/**
 * useGoals — hook de metas com persistência AsyncStorage
 * Gerencia: progresso, marcos (milestones), prazo, categorias, Alexandre insights
 */

import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type GoalStatus = 'active' | 'completed' | 'paused' | 'at_risk';
export type GoalCategory = 'carreira' | 'financeiro' | 'saude' | 'aprendizado' | 'relacionamentos' | 'pessoal';

export interface GoalMilestone {
  id: string;
  title: string;
  targetValue: number;
  reachedAt?: string; // ISO date
}

export interface GoalData {
  id: string;
  title: string;
  emoji: string;
  color: string;
  category: GoalCategory;
  description?: string;
  currentValue: number;
  targetValue: number;
  unit: string; // 'R$', 'kg', '%', 'páginas', 'km', ...
  startDate: string;
  deadline: string;
  milestones: GoalMilestone[];
  status: GoalStatus;
  weeklyUpdates: { date: string; value: number; note?: string }[];
}

const STORAGE_KEY = '@youli:goals';

function daysUntil(dateISO: string): number {
  const target = new Date(dateISO);
  const now = new Date();
  return Math.ceil((target.getTime() - now.getTime()) / 86400000);
}

function progressPercent(current: number, target: number): number {
  if (target <= 0) return 0;
  return Math.min(100, Math.round((current / target) * 100));
}

function goalStatus(goal: GoalData): GoalStatus {
  if (goal.status === 'completed' || goal.status === 'paused') return goal.status;
  const percent = progressPercent(goal.currentValue, goal.targetValue);
  if (percent >= 100) return 'completed';
  const days = daysUntil(goal.deadline);
  if (days < 0) return 'at_risk';
  // Ritmo esperado
  const totalDays = Math.max(1, Math.ceil(
    (new Date(goal.deadline).getTime() - new Date(goal.startDate).getTime()) / 86400000
  ));
  const elapsed = totalDays - Math.max(0, days);
  const expectedPercent = Math.round((elapsed / totalDays) * 100);
  if (percent < expectedPercent - 20) return 'at_risk';
  return 'active';
}

// Gera valores históricos para demo
function generateHistory(current: number, target: number, weeks: number) {
  const updates: GoalData['weeklyUpdates'] = [];
  for (let i = weeks; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i * 7);
    const progress = Math.max(0, current - (target * 0.08 * i) + (Math.random() * target * 0.04));
    updates.push({ date: d.toISOString().split('T')[0], value: Math.round(progress) });
  }
  return updates;
}

const DEFAULT_GOALS: GoalData[] = [
  {
    id: '1',
    title: 'Reserva de Emergência',
    emoji: '🏦',
    color: '#0891B2',
    category: 'financeiro',
    description: 'Construir 6 meses de despesas como reserva',
    currentValue: 8500,
    targetValue: 18000,
    unit: 'R$',
    startDate: new Date(Date.now() - 90 * 86400000).toISOString().split('T')[0],
    deadline: new Date(Date.now() + 180 * 86400000).toISOString().split('T')[0],
    milestones: [
      { id: 'm1', title: '25% — R$ 4.500', targetValue: 4500, reachedAt: new Date(Date.now() - 60 * 86400000).toISOString() },
      { id: 'm2', title: '50% — R$ 9.000', targetValue: 9000 },
      { id: 'm3', title: '75% — R$ 13.500', targetValue: 13500 },
      { id: 'm4', title: '100% — R$ 18.000', targetValue: 18000 },
    ],
    status: 'active',
    weeklyUpdates: generateHistory(8500, 18000, 12),
  },
  {
    id: '2',
    title: 'Correr 10km',
    emoji: '🏃',
    color: '#059669',
    category: 'saude',
    description: 'Completar uma corrida de 10km sem parar',
    currentValue: 6.5,
    targetValue: 10,
    unit: 'km',
    startDate: new Date(Date.now() - 45 * 86400000).toISOString().split('T')[0],
    deadline: new Date(Date.now() + 60 * 86400000).toISOString().split('T')[0],
    milestones: [
      { id: 'm1', title: '3km contínuos', targetValue: 3, reachedAt: new Date(Date.now() - 30 * 86400000).toISOString() },
      { id: 'm2', title: '5km contínuos', targetValue: 5, reachedAt: new Date(Date.now() - 14 * 86400000).toISOString() },
      { id: 'm3', title: '8km contínuos', targetValue: 8 },
      { id: 'm4', title: '10km — meta!', targetValue: 10 },
    ],
    status: 'active',
    weeklyUpdates: generateHistory(6.5, 10, 6),
  },
  {
    id: '3',
    title: 'Lançar o Youli',
    emoji: '🚀',
    color: '#7C3AED',
    category: 'carreira',
    description: 'Lançar o MVP do Youli na App Store e Play Store',
    currentValue: 65,
    targetValue: 100,
    unit: '%',
    startDate: new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0],
    deadline: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
    milestones: [
      { id: 'm1', title: 'MVP backend', targetValue: 25, reachedAt: new Date(Date.now() - 20 * 86400000).toISOString() },
      { id: 'm2', title: 'MVP mobile', targetValue: 50, reachedAt: new Date(Date.now() - 5 * 86400000).toISOString() },
      { id: 'm3', title: 'Beta users', targetValue: 75 },
      { id: 'm4', title: 'App Store live', targetValue: 100 },
    ],
    status: 'active',
    weeklyUpdates: generateHistory(65, 100, 4),
  },
  {
    id: '4',
    title: 'Ler 24 livros',
    emoji: '📚',
    color: '#D97706',
    category: 'aprendizado',
    description: '2 livros por mês, 24 no ano',
    currentValue: 8,
    targetValue: 24,
    unit: 'livros',
    startDate: new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0],
    deadline: new Date(new Date().getFullYear(), 11, 31).toISOString().split('T')[0],
    milestones: [
      { id: 'm1', title: '6 livros — Q1', targetValue: 6, reachedAt: new Date(Date.now() - 40 * 86400000).toISOString() },
      { id: 'm2', title: '12 livros — Q2', targetValue: 12 },
      { id: 'm3', title: '18 livros — Q3', targetValue: 18 },
      { id: 'm4', title: '24 livros — ano!', targetValue: 24 },
    ],
    status: 'active',
    weeklyUpdates: generateHistory(8, 24, 8),
  },
];

export function useGoals() {
  const [goals, setGoals] = useState<GoalData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((raw) => {
      if (raw) {
        try { setGoals(JSON.parse(raw)); }
        catch { setGoals(DEFAULT_GOALS); }
      } else {
        setGoals(DEFAULT_GOALS);
        AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_GOALS));
      }
      setLoading(false);
    });
  }, []);

  const updateProgress = useCallback((goalId: string, newValue: number, note?: string) => {
    setGoals((prev) => {
      const updated = prev.map((g) => {
        if (g.id !== goalId) return g;
        const today = new Date().toISOString().split('T')[0];
        const weeklyUpdates = [
          ...g.weeklyUpdates.filter(u => u.date !== today),
          { date: today, value: newValue, note },
        ];
        // Marca milestones atingidos
        const milestones = g.milestones.map((m) => ({
          ...m,
          reachedAt: !m.reachedAt && newValue >= m.targetValue
            ? new Date().toISOString()
            : m.reachedAt,
        }));
        return { ...g, currentValue: newValue, weeklyUpdates, milestones };
      });
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  const addGoal = useCallback((goal: Omit<GoalData, 'id' | 'status' | 'weeklyUpdates'>) => {
    const newGoal: GoalData = {
      ...goal,
      id: Date.now().toString(),
      status: 'active',
      weeklyUpdates: [{ date: new Date().toISOString().split('T')[0], value: goal.currentValue }],
    };
    setGoals((prev) => {
      const updated = [...prev, newGoal];
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);


  const deleteGoal = useCallback((id: string) => {
    setGoals(prev => {
      const updated = prev.filter(g => g.id !== id);
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  const pauseGoal = useCallback((id: string) => {
    setGoals(prev => {
      const updated = prev.map(g => g.id === id ? { ...g, status: 'paused' as GoalStatus } : g);
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  const resumeGoal = useCallback((id: string) => {
    setGoals(prev => {
      const updated = prev.map(g => g.id === id ? { ...g, status: 'active' as GoalStatus } : g);
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  // Stats
  const stats = {
    total: goals.length,
    active: goals.filter(g => goalStatus(g) === 'active').length,
    completed: goals.filter(g => goalStatus(g) === 'completed').length,
    atRisk: goals.filter(g => goalStatus(g) === 'at_risk').length,
    avgProgress: goals.length
      ? Math.round(goals.reduce((s, g) => s + progressPercent(g.currentValue, g.targetValue), 0) / goals.length)
      : 0,
    milestonesReached: goals.reduce((s, g) => s + g.milestones.filter(m => !!m.reachedAt).length, 0),
  };

  return { goals, loading, stats, updateProgress, addGoal, deleteGoal, pauseGoal, resumeGoal, goalStatus, progressPercent, daysUntil };
}
