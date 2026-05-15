/**
 * useSmartNotifications — orquestra notificações contextuais inteligentes
 *
 * Fluxo:
 * 1. Coleta contexto dos outros hooks (hábitos, metas, finanças, tarefas)
 * 2. Envia para /api/notifications/evaluate (engine de regras)
 * 3. Agenda notificações locais via expo-notifications
 * 4. Persiste lastNotifications para respeitar cooldown
 * 5. Mantém histórico in-app em estado local
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useHabits } from './useHabits';
import { useGoals } from './useGoals';
import { useFinance } from './useFinance';

const API_BASE = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000';
const STORAGE_KEY = '@youli:last_notifications';
const HISTORY_KEY = '@youli:notification_history';

export interface SmartNotification {
  id: string;
  type: string;
  title: string;
  body: string;
  agent: string;
  agentEmoji: string;
  color: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  receivedAt: string;
  read: boolean;
  data?: Record<string, string>;
}

const PRIORITY_LABEL: Record<string, string> = {
  critical: '🔴 Urgente',
  high: '🟠 Alta',
  medium: '🟡 Média',
  low: '🟢 Info',
};

export function useSmartNotifications() {
  const { habits, isCompletedToday } = useHabits();
  const { goals, goalStatus, progressPercent } = useGoals();
  const { monthlySummary, transactions } = useFinance();

  const [notifications, setNotifications] = useState<SmartNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [evaluating, setEvaluating] = useState(false);
  const evaluatedRef = useRef(false);

  // Carrega histórico persistido
  useEffect(() => {
    AsyncStorage.getItem(HISTORY_KEY).then(raw => {
      if (raw) {
        const saved: SmartNotification[] = JSON.parse(raw);
        setNotifications(saved);
        setUnreadCount(saved.filter(n => !n.read).length);
      }
    });
  }, []);

  const buildContext = useCallback(() => {
    // Calcular gasto de hoje
    const today = new Date().toISOString().split('T')[0];
    const todayTxs = transactions.filter(t => t.date === today && t.type === 'expense');
    const todaySpend = todayTxs.reduce((s, t) => s + t.amount, 0);

    // Média últimos 7 dias
    const days7: Record<string, number> = {};
    transactions
      .filter(t => t.type === 'expense')
      .forEach(t => {
        days7[t.date] = (days7[t.date] ?? 0) + t.amount;
      });
    const vals7 = Object.values(days7).slice(-7);
    const avgDailySpend7d = vals7.length ? vals7.reduce((a, b) => a + b, 0) / vals7.length : 0;

    return {
      habits: habits.map(h => ({
        id: h.id,
        title: h.title,
        emoji: h.emoji,
        streak: h.streak,
        doneToday: isCompletedToday(h),
      })),
      goals: goals.map(g => ({
        id: g.id,
        title: g.title,
        emoji: g.emoji,
        progress: progressPercent(g.currentValue, g.targetValue),
        daysUntilDeadline: Math.ceil(
          (new Date(g.deadline).getTime() - Date.now()) / 86_400_000
        ),
        status: goalStatus(g),
        nextMilestoneAt: g.milestones
          .filter(m => !m.reachedAt)
          .map(m => progressPercent(m.targetValue, g.targetValue))
          .sort((a, b) => a - b)[0],
      })),
      finance: {
        savingsRate: monthlySummary.savingsRate,
        todaySpend,
        avgDailySpend7d,
      },
      tasks: {
        lastCompletedHoursAgo: 24, // mock — integra com useTasks depois
        completedToday: 0,
      },
    };
  }, [habits, goals, transactions, isCompletedToday, progressPercent, goalStatus, monthlySummary]);

  const scheduleLocalNotification = useCallback(async (notif: SmartNotification) => {
    try {
      const { default: Notifications } = await import('expo-notifications');
      await Notifications.scheduleNotificationAsync({
        content: {
          title: notif.title,
          body: notif.body,
          data: { ...notif.data, type: notif.type },
          sound: true,
        },
        trigger: null, // dispara imediatamente
      });
    } catch {
      // Notificações não disponíveis (simulador sem permissão)
    }
  }, []);

  const evaluate = useCallback(async () => {
    if (evaluating) return;
    setEvaluating(true);
    try {
      const lastRaw = await AsyncStorage.getItem(STORAGE_KEY);
      const lastNotifications: Record<string, string> = lastRaw ? JSON.parse(lastRaw) : {};

      const context = { ...buildContext(), lastNotifications };

      const res = await fetch(`${API_BASE}/api/notifications/evaluate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(context),
      });

      if (!res.ok) return;
      const { notifications: newNotifs } = await res.json();

      if (!newNotifs?.length) return;

      // Atualizar lastNotifications
      const updatedLast = { ...lastNotifications };
      newNotifs.forEach((n: any) => {
        updatedLast[n.type] = new Date().toISOString();
      });
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updatedLast));

      // Adicionar ao histórico
      const newHistory: SmartNotification[] = newNotifs.map((n: any) => ({
        ...n,
        receivedAt: new Date().toISOString(),
        read: false,
      }));

      setNotifications(prev => {
        const merged = [...newHistory, ...prev].slice(0, 50); // max 50
        AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(merged));
        return merged;
      });
      setUnreadCount(c => c + newHistory.length);

      // Disparar notificação push para a mais importante
      const top = newHistory[0];
      if (top && ['critical', 'high'].includes(top.priority)) {
        await scheduleLocalNotification(top);
      }
    } catch {
      // Silencioso — sem conexão ou API offline
    } finally {
      setEvaluating(false);
    }
  }, [buildContext, evaluating, scheduleLocalNotification]);

  // Avalia ao montar (uma vez por sessão)
  useEffect(() => {
    if (evaluatedRef.current || habits.length === 0) return;
    evaluatedRef.current = true;
    evaluate();
  }, [habits.length, evaluate]);

  const markRead = useCallback((id: string) => {
    setNotifications(prev => {
      const updated = prev.map(n => n.id === id ? { ...n, read: true } : n);
      AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
      return updated;
    });
    setUnreadCount(c => Math.max(0, c - 1));
  }, []);

  const markAllRead = useCallback(() => {
    setNotifications(prev => {
      const updated = prev.map(n => ({ ...n, read: true }));
      AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
      return updated;
    });
    setUnreadCount(0);
  }, []);

  const clearHistory = useCallback(() => {
    setNotifications([]);
    setUnreadCount(0);
    AsyncStorage.removeItem(HISTORY_KEY);
    AsyncStorage.removeItem(STORAGE_KEY);
  }, []);

  return {
    notifications,
    unreadCount,
    evaluating,
    evaluate,
    markRead,
    markAllRead,
    clearHistory,
    PRIORITY_LABEL,
  };
}
