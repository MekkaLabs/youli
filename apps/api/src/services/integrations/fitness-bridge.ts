/**
 * Fitness Bridge — SWE-CI Integration Layer
 * Após cada sync (Strava ou Zepp), registra pontos de evolução
 * no Evolution Tracker para alimentar o Life Health Score.
 */
import { recordEvolutionPoint } from '../agents/life-evolution-tracker';
import type { StravaSyncResult } from './strava';
import type { ZeppSyncResult } from './zepp';
import { loadCachedStravaActivities, loadStravaToken } from './strava';
import { loadCachedZeppHealth, loadZeppToken } from './zepp';

const AREA = 'fitness';

// ─── Strava → SWE-CI ─────────────────────────────────────────────────────────

export interface StravaBridgeResult {
  userId: string;
  pointsRecorded: number;
  metrics: string[];
}

export function bridgeStravaToSWECI(
  userId: string,
  result: StravaSyncResult
): StravaBridgeResult {
  const metrics: string[] = [];
  let pointsRecorded = 0;

  const weekAgo = Date.now() - 7 * 86_400_000;
  const weekSessions = result.activities.filter(
    (a) => new Date(a.date).getTime() >= weekAgo
  );

  // 1. Weekly activity count
  recordEvolutionPoint(userId, AREA, 'treinos_semana', weekSessions.length, 'auto');
  metrics.push(`treinos_semana=${weekSessions.length}`);
  pointsRecorded++;

  // 2. Total weekly duration (minutes)
  const weekDuration = weekSessions.reduce((s, a) => s + a.durationMin, 0);
  recordEvolutionPoint(userId, AREA, 'duracao_semanal_min', weekDuration, 'auto');
  metrics.push(`duracao_semanal_min=${weekDuration}`);
  pointsRecorded++;

  // 3. Total weekly distance (km) — cardio only
  const cardioTypes = ['run', 'ride', 'swim', 'hike', 'walk', 'outdoor_running', 'cycling'];
  const weekDistance = weekSessions
    .filter((a) => cardioTypes.some((t) => a.type.includes(t)))
    .reduce((s, a) => s + (a.distanceKm ?? 0), 0);
  if (weekDistance > 0) {
    recordEvolutionPoint(userId, AREA, 'distancia_semanal_km', parseFloat(weekDistance.toFixed(2)), 'auto');
    metrics.push(`distancia_semanal_km=${weekDistance.toFixed(2)}`);
    pointsRecorded++;
  }

  // 4. Average workout duration
  if (weekSessions.length > 0) {
    const avgDuration = weekDuration / weekSessions.length;
    recordEvolutionPoint(userId, AREA, 'duracao_media_min', Math.round(avgDuration), 'auto');
    metrics.push(`duracao_media_min=${Math.round(avgDuration)}`);
    pointsRecorded++;
  }

  // 5. Average heart rate (if available)
  const hrSessions = weekSessions.filter((a) => a.avgHeartRate && a.avgHeartRate > 0);
  if (hrSessions.length > 0) {
    const avgHR = hrSessions.reduce((s, a) => s + (a.avgHeartRate ?? 0), 0) / hrSessions.length;
    recordEvolutionPoint(userId, AREA, 'freq_cardiaca_media', Math.round(avgHR), 'auto');
    metrics.push(`freq_cardiaca_media=${Math.round(avgHR)}`);
    pointsRecorded++;
  }

  return { userId, pointsRecorded, metrics };
}

// ─── Zepp → SWE-CI ───────────────────────────────────────────────────────────

export interface ZeppBridgeResult {
  userId: string;
  pointsRecorded: number;
  metrics: string[];
}

export function bridgeZeppToSWECI(
  userId: string,
  result: ZeppSyncResult
): ZeppBridgeResult {
  const metrics: string[] = [];
  let pointsRecorded = 0;
  const { normalized, workoutSessions } = result;

  if (normalized.steps > 0) {
    recordEvolutionPoint(userId, AREA, 'passos_diarios', normalized.steps, 'auto');
    metrics.push(`passos_diarios=${normalized.steps}`);
    pointsRecorded++;
  }

  if (normalized.sleepHours > 0) {
    recordEvolutionPoint(userId, AREA, 'sono_horas', normalized.sleepHours, 'auto');
    metrics.push(`sono_horas=${normalized.sleepHours}`);
    pointsRecorded++;

    if (normalized.sleepScore && normalized.sleepScore > 0) {
      recordEvolutionPoint(userId, AREA, 'score_sono', normalized.sleepScore, 'auto');
      metrics.push(`score_sono=${normalized.sleepScore}`);
      pointsRecorded++;
    }
  }

  if (normalized.heartRateResting > 0) {
    recordEvolutionPoint(userId, AREA, 'fc_repouso', normalized.heartRateResting, 'auto');
    metrics.push(`fc_repouso=${normalized.heartRateResting}`);
    pointsRecorded++;
  }

  if (normalized.activeCalories > 0) {
    recordEvolutionPoint(userId, AREA, 'calorias_ativas', normalized.activeCalories, 'auto');
    metrics.push(`calorias_ativas=${normalized.activeCalories}`);
    pointsRecorded++;
  }

  if (normalized.exerciseMin > 0) {
    recordEvolutionPoint(userId, AREA, 'minutos_exercicio', normalized.exerciseMin, 'auto');
    metrics.push(`minutos_exercicio=${normalized.exerciseMin}`);
    pointsRecorded++;
  }

  if (workoutSessions.length > 0) {
    recordEvolutionPoint(userId, AREA, 'treinos_zepp', workoutSessions.length, 'auto');
    metrics.push(`treinos_zepp=${workoutSessions.length}`);
    pointsRecorded++;
  }

  return { userId, pointsRecorded, metrics };
}

// ─── Combined Fitness Summary ─────────────────────────────────────────────────

export interface FitnessSummary {
  sources: { strava: boolean; zepp: boolean; healthkit: boolean };
  today: {
    steps: number;
    activeCalories: number;
    sleepHours: number;
    heartRateResting: number;
    exerciseMin: number;
  };
  workouts: Array<{
    id: string;
    type: string;
    emoji: string;
    date: string;
    durationMin: number;
    calories: number;
    distanceKm?: number;
    avgHeartRate?: number;
    source: string;
  }>;
  lastSyncAt: string | null;
}

export function buildFitnessSummary(userId: string): FitnessSummary {
  const stravaConnected = loadStravaToken(userId) !== null;
  const zeppConnected   = loadZeppToken(userId) !== null;

  const stravaActivities = loadCachedStravaActivities(userId);
  const zeppCache        = loadCachedZeppHealth(userId);

  const workouts = [
    ...stravaActivities.slice(0, 10),
    ...(zeppCache?.workoutSessions ?? []).slice(0, 10),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 15);

  const today = {
    steps:            zeppCache?.normalized.steps ?? 0,
    activeCalories:   zeppCache?.normalized.activeCalories ?? 0,
    sleepHours:       zeppCache?.normalized.sleepHours ?? 0,
    heartRateResting: zeppCache?.normalized.heartRateResting ?? 0,
    exerciseMin:      zeppCache?.normalized.exerciseMin ?? 0,
  };

  const lastSyncAt = zeppCache?.snapshot.syncedAt ?? loadZeppToken(userId)?.syncedAt ?? null;

  return {
    sources: { strava: stravaConnected, zepp: zeppConnected, healthkit: false },
    today,
    workouts,
    lastSyncAt,
  };
}
