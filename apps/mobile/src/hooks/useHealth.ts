/**
 * useHealth — dados de saúde via Apple Health (HealthKit) ou Google Fit
 *
 * Fontes por ordem de prioridade:
 * 1. expo-health (HealthKit iOS / Health Connect Android)
 * 2. /api/fitness/route (dados sincronizados no servidor)
 * 3. Mock com dados representativos
 */

import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3002';
const CACHE_KEY = '@youli:health_cache';

export interface DailyHealthData {
  date: string;           // YYYY-MM-DD
  steps: number;
  activeCalories: number;
  totalCalories: number;
  distanceKm: number;
  sleepHours: number;
  heartRateAvg: number;
  heartRateResting: number;
  standHours: number;
  exerciseMin: number;
  waterMl: number;
}

export interface WorkoutSession {
  id: string;
  type: string;           // 'running' | 'cycling' | 'strength' | etc
  emoji: string;
  date: string;
  durationMin: number;
  calories: number;
  distanceKm?: number;
  avgHeartRate?: number;
  source: 'healthkit' | 'api' | 'mock';
}

export interface HealthSummary {
  today: DailyHealthData;
  weekAvg: Partial<DailyHealthData>;
  weekTrend: Array<{ date: string; steps: number; calories: number; sleep: number }>;
  workouts: WorkoutSession[];
  source: 'healthkit' | 'api' | 'mock';
}

// Metas diárias recomendadas
export const HEALTH_GOALS = {
  steps: 10000,
  activeCalories: 500,
  sleepHours: 8,
  exerciseMin: 30,
  standHours: 12,
  waterMl: 2500,
};

function mockWeekData(): Array<{ date: string; steps: number; calories: number; sleep: number }> {
  const today = new Date();
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() - (6 - i));
    return {
      date: d.toISOString().split('T')[0],
      steps: 6000 + Math.floor(Math.random() * 6000),
      calories: 350 + Math.floor(Math.random() * 300),
      sleep: 5.5 + Math.random() * 3,
    };
  });
}

function mockWorkouts(): WorkoutSession[] {
  return [
    { id: 'w1', type: 'running', emoji: '🏃', date: new Date().toISOString().split('T')[0], durationMin: 35, calories: 320, distanceKm: 5.2, avgHeartRate: 158, source: 'mock' },
    { id: 'w2', type: 'strength', emoji: '🏋️', date: new Date(Date.now() - 86400000 * 2).toISOString().split('T')[0], durationMin: 55, calories: 280, source: 'mock' },
    { id: 'w3', type: 'cycling', emoji: '🚴', date: new Date(Date.now() - 86400000 * 4).toISOString().split('T')[0], durationMin: 45, calories: 380, distanceKm: 18, avgHeartRate: 142, source: 'mock' },
  ];
}

export function useHealth() {
  const [summary, setSummary] = useState<HealthSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [permissionStatus, setPermissionStatus] = useState<'unknown' | 'granted' | 'denied'>('unknown');

  const requestPermission = useCallback(async (): Promise<boolean> => {
    try {
      // expo-health (disponível via expo-modules-core com plugin customizado)
      // Na maioria dos projetos Expo bare: usar react-native-health ou expo-health
      const { default: Health } = await import('expo-health');
      const permissions = [
        Health.HealthDataType.Steps,
        Health.HealthDataType.ActiveEnergyBurned,
        Health.HealthDataType.SleepAnalysis,
        Health.HealthDataType.HeartRate,
        Health.HealthDataType.Workout,
        Health.HealthDataType.WalkingRunningDistance,
        Health.HealthDataType.StandTime,
        Health.HealthDataType.ExerciseTime,
      ];
      const granted = await Health.requestPermissionsAsync(permissions);
      const ok = granted.every((g: any) => g.status === 'granted');
      setPermissionStatus(ok ? 'granted' : 'denied');
      return ok;
    } catch {
      setPermissionStatus('denied');
      return false;
    }
  }, []);

  const loadFromHealthKit = useCallback(async (): Promise<HealthSummary | null> => {
    try {
      const { default: Health } = await import('expo-health');
      const today = new Date();
      const startOfDay = new Date(today.toISOString().split('T')[0] + 'T00:00:00');
      const endOfDay = new Date(today.toISOString().split('T')[0] + 'T23:59:59');

      const [steps, activeCal, sleep, heartRate, workoutsRaw] = await Promise.all([
        Health.getStepsAsync(startOfDay, endOfDay).catch(() => 0),
        Health.getActiveEnergyBurnedAsync(startOfDay, endOfDay).catch(() => 0),
        Health.getSleepSamplesAsync(new Date(today.getTime() - 86400000), today).catch(() => []),
        Health.getHeartRateSamplesAsync(startOfDay, endOfDay).catch(() => []),
        Health.getWorkoutsAsync(new Date(today.getTime() - 7 * 86400000), today).catch(() => []),
      ]);

      const sleepHours = Array.isArray(sleep)
        ? sleep.reduce((acc: number, s: any) => acc + (s.value || 0), 0) / 3600
        : 0;
      const hrAvg = Array.isArray(heartRate) && heartRate.length
        ? heartRate.reduce((a: number, h: any) => a + (h.value || 0), 0) / heartRate.length
        : 0;

      const todayData: DailyHealthData = {
        date: today.toISOString().split('T')[0],
        steps: typeof steps === 'number' ? steps : 0,
        activeCalories: typeof activeCal === 'number' ? activeCal : 0,
        totalCalories: (typeof activeCal === 'number' ? activeCal : 0) + 1800,
        distanceKm: ((typeof steps === 'number' ? steps : 0) * 0.0008),
        sleepHours,
        heartRateAvg: hrAvg,
        heartRateResting: hrAvg > 0 ? hrAvg - 20 : 0,
        standHours: 0,
        exerciseMin: 0,
        waterMl: 0,
      };

      const workouts: WorkoutSession[] = Array.isArray(workoutsRaw)
        ? workoutsRaw.slice(0, 5).map((w: any, i: number) => ({
            id: `hk_${i}`,
            type: w.activityType?.toLowerCase() ?? 'workout',
            emoji: '🏃',
            date: new Date(w.startDate).toISOString().split('T')[0],
            durationMin: Math.round((new Date(w.endDate).getTime() - new Date(w.startDate).getTime()) / 60000),
            calories: w.totalEnergyBurned ?? 0,
            distanceKm: w.totalDistance ? w.totalDistance / 1000 : undefined,
            source: 'healthkit' as const,
          }))
        : [];

      return {
        today: todayData,
        weekAvg: { steps: todayData.steps * 0.9, sleepHours: sleepHours * 0.95 },
        weekTrend: mockWeekData(),
        workouts: workouts.length ? workouts : mockWorkouts(),
        source: 'healthkit',
      };
    } catch {
      return null;
    }
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      // 1. HealthKit (iOS)
      const hkData = await loadFromHealthKit();
      if (hkData) {
        setSummary(hkData);
        setPermissionStatus('granted');
        await AsyncStorage.setItem(CACHE_KEY, JSON.stringify({ data: hkData, ts: Date.now() }));
        return;
      }

      // 2. API
      const res = await fetch(`${API_BASE}/api/fitness/route`).catch(() => null);
      if (res?.ok) {
        const apiData = await res.json();
        if (apiData?.fitness) {
          setSummary({ ...apiData.fitness, source: 'api' });
          return;
        }
      }

      // 3. Cache
      const cached = await AsyncStorage.getItem(CACHE_KEY);
      if (cached) {
        const { data, ts } = JSON.parse(cached);
        if (Date.now() - ts < 3_600_000) { // 1h
          setSummary(data);
          return;
        }
      }

      // 4. Mock
      const week = mockWeekData();
      const lastDay = week[week.length - 1];
      setSummary({
        today: {
          date: lastDay.date,
          steps: lastDay.steps,
          activeCalories: lastDay.calories,
          totalCalories: lastDay.calories + 1800,
          distanceKm: parseFloat((lastDay.steps * 0.0008).toFixed(1)),
          sleepHours: parseFloat(lastDay.sleep.toFixed(1)),
          heartRateAvg: 72,
          heartRateResting: 58,
          standHours: 8,
          exerciseMin: 35,
          waterMl: 1800,
        },
        weekAvg: {
          steps: Math.round(week.reduce((s, d) => s + d.steps, 0) / 7),
          sleepHours: parseFloat((week.reduce((s, d) => s + d.sleep, 0) / 7).toFixed(1)),
          activeCalories: Math.round(week.reduce((s, d) => s + d.calories, 0) / 7),
        },
        weekTrend: week,
        workouts: mockWorkouts(),
        source: 'mock',
      });
    } finally {
      setLoading(false);
    }
  }, [loadFromHealthKit]);

  useEffect(() => { load(); }, []);

  // Progresso em relação às metas
  const progress = summary ? {
    steps: Math.min(100, Math.round((summary.today.steps / HEALTH_GOALS.steps) * 100)),
    calories: Math.min(100, Math.round((summary.today.activeCalories / HEALTH_GOALS.activeCalories) * 100)),
    sleep: Math.min(100, Math.round((summary.today.sleepHours / HEALTH_GOALS.sleepHours) * 100)),
    exercise: Math.min(100, Math.round((summary.today.exerciseMin / HEALTH_GOALS.exerciseMin) * 100)),
    water: Math.min(100, Math.round((summary.today.waterMl / HEALTH_GOALS.waterMl) * 100)),
  } : null;

  return { summary, loading, progress, permissionStatus, requestPermission, refresh: load };
}
