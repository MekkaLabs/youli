/**
 * useWeeklyReview — detecta se é segunda-feira e se o review da semana já foi feito
 * Abre automaticamente se não foi feito ainda esta semana
 */
import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = '@youli:weekly_review';

export interface WeeklyReviewData {
  weekStart: string;      // ISO da segunda-feira
  reflection: string;
  wins: string[];
  improvements: string[];
  nextWeekFocus: string;
  moodRating: 1 | 2 | 3 | 4 | 5;
  completedAt: string;
}

function getMondayISO(date = new Date()): string {
  const d = new Date(date);
  const day = d.getDay();
  const diff = (day === 0 ? -6 : 1) - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

export function useWeeklyReview() {
  const [shouldShow, setShouldShow] = useState(false);
  const [lastReview, setLastReview] = useState<WeeklyReviewData | null>(null);

  useEffect(() => {
    (async () => {
      const raw = await AsyncStorage.getItem(KEY);
      if (raw) {
        const data: WeeklyReviewData = JSON.parse(raw);
        setLastReview(data);
        // Mostra se a semana atual ainda não foi revisada
        const thisMonday = getMondayISO();
        if (data.weekStart !== thisMonday) {
          // Só auto-abre na segunda-feira
          const today = new Date().getDay();
          if (today === 1) setShouldShow(true);
        }
      } else {
        // Primeira vez — mostra na segunda
        const today = new Date().getDay();
        if (today === 1) setShouldShow(true);
      }
    })();
  }, []);

  const saveReview = useCallback(async (review: Omit<WeeklyReviewData, 'weekStart' | 'completedAt'>) => {
    const data: WeeklyReviewData = {
      ...review,
      weekStart: getMondayISO(),
      completedAt: new Date().toISOString(),
    };
    await AsyncStorage.setItem(KEY, JSON.stringify(data));
    setLastReview(data);
    setShouldShow(false);
  }, []);

  const dismiss = useCallback(() => setShouldShow(false), []);
  const openManually = useCallback(() => setShouldShow(true), []);

  return { shouldShow, lastReview, saveReview, dismiss, openManually };
}
