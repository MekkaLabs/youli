/**
 * useXP — sistema de gamificação com XP, níveis e conquistas
 */
import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const XP_KEY = '@youli:xp_data';

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  xpReward: number;
  unlockedAt?: string;
  category: 'habits' | 'goals' | 'finance' | 'fitness' | 'streak' | 'social';
  condition: string; // human-readable
}

export interface XPData {
  total: number;
  level: number;
  currentLevelXP: number;   // XP dentro do nível atual
  nextLevelXP: number;      // XP necessário para o próximo nível
  history: { amount: number; reason: string; date: string }[];
  unlockedAchievements: string[];
}

const XP_PER_LEVEL = 500;

const ALL_ACHIEVEMENTS: Achievement[] = [
  { id: 'first_habit',      title: 'Primeira Pedra', description: 'Complete seu primeiro hábito', icon: '🪨', xpReward: 50, category: 'habits', condition: '1 hábito completo' },
  { id: 'streak_7',         title: 'Semana Perfeita', description: '7 dias de streak em qualquer hábito', icon: '🔥', xpReward: 100, category: 'streak', condition: '7 dias seguidos' },
  { id: 'streak_30',        title: 'Mês de Ferro', description: '30 dias de streak contínuo', icon: '💎', xpReward: 500, category: 'streak', condition: '30 dias seguidos' },
  { id: 'first_goal',       title: 'Destino Definido', description: 'Crie sua primeira meta', icon: '🎯', xpReward: 30, category: 'goals', condition: '1 meta criada' },
  { id: 'goal_50',          title: 'Meio Caminho', description: 'Alcance 50% de progresso em uma meta', icon: '⚡', xpReward: 75, category: 'goals', condition: 'Meta a 50%' },
  { id: 'goal_complete',    title: 'Missão Cumprida', description: 'Conclua sua primeira meta', icon: '🏆', xpReward: 200, category: 'goals', condition: '1 meta concluída' },
  { id: 'bank_connect',     title: 'Open Banking', description: 'Conecte seu primeiro banco', icon: '🏦', xpReward: 60, category: 'finance', condition: '1 banco conectado' },
  { id: 'savings_1k',       title: 'Poupador', description: 'Acumule R$1.000 em saldo', icon: '💰', xpReward: 150, category: 'finance', condition: 'Saldo ≥ R$1.000' },
  { id: 'fitness_connect',  title: 'Corpo Conectado', description: 'Conecte Apple Health ou Google Fit', icon: '💪', xpReward: 60, category: 'fitness', condition: 'Health conectado' },
  { id: 'steps_10k',        title: 'Dez Mil Passos', description: 'Complete 10.000 passos em um dia', icon: '👟', xpReward: 80, category: 'fitness', condition: '10k passos/dia' },
  { id: 'insights_5',       title: 'Auto Consciente', description: 'Veja 5 insights diferentes', icon: '🦉', xpReward: 40, category: 'social', condition: '5 insights lidos' },
  { id: 'weekly_review',    title: 'Reflexivo', description: 'Complete seu primeiro review semanal', icon: '📋', xpReward: 80, category: 'social', condition: '1 review completo' },
  { id: 'level_5',          title: 'Veterano', description: 'Alcance o nível 5', icon: '⭐', xpReward: 0, category: 'social', condition: 'Nível 5' },
  { id: 'level_10',         title: 'Elite', description: 'Alcance o nível 10', icon: '👑', xpReward: 0, category: 'social', condition: 'Nível 10' },
  { id: 'tasks_10',         title: 'Executor', description: 'Conclua 10 tarefas', icon: '✅', xpReward: 100, category: 'goals', condition: '10 tarefas concluídas' },
];

function calcLevel(total: number): { level: number; currentLevelXP: number; nextLevelXP: number } {
  const level = Math.floor(total / XP_PER_LEVEL) + 1;
  const currentLevelXP = total % XP_PER_LEVEL;
  const nextLevelXP = XP_PER_LEVEL;
  return { level, currentLevelXP, nextLevelXP };
}

const DEFAULT_XP: XPData = {
  total: 0, level: 1, currentLevelXP: 0, nextLevelXP: XP_PER_LEVEL,
  history: [], unlockedAchievements: [],
};

export function useXP() {
  const [xpData, setXPData] = useState<XPData>(DEFAULT_XP);
  const [newAchievement, setNewAchievement] = useState<Achievement | null>(null);

  useEffect(() => {
    AsyncStorage.getItem(XP_KEY).then(raw => {
      if (raw) setXPData({ ...DEFAULT_XP, ...JSON.parse(raw) });
    });
  }, []);

  const addXP = useCallback(async (amount: number, reason: string) => {
    setXPData(prev => {
      const newTotal = prev.total + amount;
      const { level, currentLevelXP, nextLevelXP } = calcLevel(newTotal);
      const entry = { amount, reason, date: new Date().toISOString() };
      const updated: XPData = {
        ...prev,
        total: newTotal,
        level,
        currentLevelXP,
        nextLevelXP,
        history: [entry, ...prev.history].slice(0, 50),
      };
      AsyncStorage.setItem(XP_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  const unlockAchievement = useCallback(async (id: string) => {
    const achievement = ALL_ACHIEVEMENTS.find(a => a.id === id);
    if (!achievement) return;

    setXPData(prev => {
      if (prev.unlockedAchievements.includes(id)) return prev;
      const updated: XPData = {
        ...prev,
        total: prev.total + achievement.xpReward,
        unlockedAchievements: [...prev.unlockedAchievements, id],
        ...calcLevel(prev.total + achievement.xpReward),
      };
      AsyncStorage.setItem(XP_KEY, JSON.stringify(updated));
      setNewAchievement(achievement);
      return updated;
    });
  }, []);

  const dismissAchievement = useCallback(() => setNewAchievement(null), []);

  const achievements = ALL_ACHIEVEMENTS.map(a => ({
    ...a,
    unlocked: xpData.unlockedAchievements.includes(a.id),
  }));

  return {
    xpData,
    achievements,
    newAchievement,
    addXP,
    unlockAchievement,
    dismissAchievement,
    levelProgress: xpData.currentLevelXP / xpData.nextLevelXP,
  };
}
