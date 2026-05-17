/**
 * Zepp Health Integration Service
 * OAuth2 + Health data sync (steps, sleep, HR, sport/workout)
 * Docs: https://developer.zepp.com/os/home
 * Compatible devices: Amazfit GTR / GTS / T-Rex series
 */
import fs from 'node:fs';
import path from 'node:path';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface ZeppToken {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;       // Unix timestamp (ms)
  openId: string;          // Zepp user ID
  syncedAt?: string;
}

export interface ZeppStepData {
  date: string;            // YYYYMMDD
  steps: number;
  distance: number;        // meters
  calories: number;
  activeTime: number;      // seconds
}

export interface ZeppSleepData {
  date: string;            // YYYYMMDD
  deepSleepMinutes: number;
  lightSleepMinutes: number;
  remSleepMinutes: number;
  awakeTimes: number;
  sleepScore: number;
  startTime: string;       // ISO
  endTime: string;         // ISO
}

export interface ZeppHeartRateData {
  date: string;
  avgHeartRate: number;
  maxHeartRate: number;
  minHeartRate: number;
  restingHeartRate: number;
}

export interface ZeppSportActivity {
  startTime: string;       // ISO
  endTime: string;
  sportType: number;       // Zepp sport type code
  calories: number;
  distance: number;        // meters
  avgHeartRate?: number;
  maxHeartRate?: number;
  steps?: number;
}

export interface ZeppHealthSnapshot {
  date: string;
  steps?: ZeppStepData;
  sleep?: ZeppSleepData;
  heartRate?: ZeppHeartRateData;
  sports: ZeppSportActivity[];
  syncedAt: string;
}

// Normalized for Youli useHealth compatibility
export interface DailyHealthData {
  date: string;
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
  sleepScore?: number;
}

// ─── Constants ───────────────────────────────────────────────────────────────

// Zepp Open Platform OAuth2 endpoints
const ZEPP_AUTH_URL    = 'https://open-api.zepp.com/oauth/authorize';
const ZEPP_TOKEN_URL   = 'https://open-api.zepp.com/oauth/access_token';
const ZEPP_API_BASE    = 'https://open-api.zepp.com/api/v2';

// Zepp sport type codes → friendly names + emojis
const SPORT_TYPE_MAP: Record<number, { name: string; emoji: string }> = {
  1:  { name: 'outdoor_running',  emoji: '🏃' },
  2:  { name: 'walking',          emoji: '🚶' },
  3:  { name: 'cycling',          emoji: '🚴' },
  4:  { name: 'mountain_bike',    emoji: '🚵' },
  5:  { name: 'indoor_cycling',   emoji: '🚴' },
  6:  { name: 'freestyle_workout',emoji: '💪' },
  7:  { name: 'treadmill',        emoji: '🏃' },
  8:  { name: 'strength',         emoji: '🏋️' },
  9:  { name: 'yoga',             emoji: '🧘' },
  10: { name: 'swimming',         emoji: '🏊' },
  11: { name: 'hiking',           emoji: '🥾' },
  12: { name: 'elliptical',       emoji: '🔄' },
  13: { name: 'rowing',           emoji: '🚣' },
  14: { name: 'indoor_running',   emoji: '🏃' },
  15: { name: 'dance',            emoji: '💃' },
  16: { name: 'basketball',       emoji: '🏀' },
  17: { name: 'football',         emoji: '⚽' },
  18: { name: 'badminton',        emoji: '🏸' },
  19: { name: 'tennis',           emoji: '🎾' },
  20: { name: 'skiing',           emoji: '⛷️' },
};

const DATA_DIR   = path.join(process.cwd(), 'src', 'repositories', '.data');
const TOKEN_FILE = path.join(DATA_DIR, 'zepp-token.json');

// ─── Token Storage ────────────────────────────────────────────────────────────

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

export function loadZeppToken(): ZeppToken | null {
  if (!fs.existsSync(TOKEN_FILE)) return null;
  try {
    return JSON.parse(fs.readFileSync(TOKEN_FILE, 'utf-8')) as ZeppToken;
  } catch { return null; }
}

function saveZeppToken(token: ZeppToken) {
  ensureDataDir();
  fs.writeFileSync(TOKEN_FILE, JSON.stringify(token, null, 2), 'utf-8');
}

export function isZeppConnected(): boolean {
  return loadZeppToken() !== null;
}

// ─── OAuth2 Flow ──────────────────────────────────────────────────────────────

export function getZeppAuthUrl(redirectUri: string, state?: string): string {
  const clientId = process.env.ZEPP_CLIENT_ID ?? '';
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'health:read sport:read profile:read',
    ...(state ? { state } : {}),
  });
  return `${ZEPP_AUTH_URL}?${params.toString()}`;
}

export async function exchangeZeppCode(
  code: string,
  redirectUri: string
): Promise<ZeppToken> {
  const clientId     = process.env.ZEPP_CLIENT_ID ?? '';
  const clientSecret = process.env.ZEPP_CLIENT_SECRET ?? '';

  const res = await fetch(ZEPP_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      code,
      grant_type: 'authorization_code',
      redirect_uri: redirectUri,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Zepp token exchange failed: ${err}`);
  }

  const data = await res.json() as {
    access_token: string;
    refresh_token: string;
    expires_in: number;      // seconds from now
    open_id: string;
  };

  const token: ZeppToken = {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt: Date.now() + data.expires_in * 1000,
    openId: data.open_id,
  };

  saveZeppToken(token);
  return token;
}

export async function refreshZeppToken(): Promise<ZeppToken | null> {
  const current = loadZeppToken();
  if (!current) return null;

  // Still valid (with 60s buffer)
  if (Date.now() < current.expiresAt - 60_000) return current;

  const clientId     = process.env.ZEPP_CLIENT_ID ?? '';
  const clientSecret = process.env.ZEPP_CLIENT_SECRET ?? '';

  const res = await fetch(ZEPP_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: current.refreshToken,
      grant_type: 'refresh_token',
    }),
  });

  if (!res.ok) return null;

  const data = await res.json() as {
    access_token: string;
    refresh_token: string;
    expires_in: number;
  };

  const refreshed: ZeppToken = {
    ...current,
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt: Date.now() + data.expires_in * 1000,
  };

  saveZeppToken(refreshed);
  return refreshed;
}

// ─── API Helpers ──────────────────────────────────────────────────────────────

async function zeppGet<T>(endpoint: string, token: ZeppToken, params: Record<string, string> = {}): Promise<T> {
  const qs = new URLSearchParams({ open_id: token.openId, ...params });
  const res = await fetch(`${ZEPP_API_BASE}${endpoint}?${qs}`, {
    headers: {
      Authorization: `Bearer ${token.accessToken}`,
      'Content-Type': 'application/json',
    },
  });
  if (!res.ok) throw new Error(`Zepp API ${endpoint}: HTTP ${res.status}`);
  const body = await res.json() as { code: number; data: T; message?: string };
  if (body.code !== 0) throw new Error(`Zepp API error ${body.code}: ${body.message}`);
  return body.data;
}

function formatZeppDate(d: Date): string {
  return d.toISOString().split('T')[0].replace(/-/g, '');  // YYYYMMDD
}

// ─── Health Data Fetchers ─────────────────────────────────────────────────────

async function fetchSteps(token: ZeppToken, startDate: string, endDate: string): Promise<ZeppStepData[]> {
  try {
    return await zeppGet<ZeppStepData[]>('/user/activity/detail', token, { start_date: startDate, end_date: endDate });
  } catch { return []; }
}

async function fetchSleep(token: ZeppToken, startDate: string, endDate: string): Promise<ZeppSleepData[]> {
  try {
    return await zeppGet<ZeppSleepData[]>('/user/sleep/detail', token, { start_date: startDate, end_date: endDate });
  } catch { return []; }
}

async function fetchHeartRate(token: ZeppToken, startDate: string, endDate: string): Promise<ZeppHeartRateData[]> {
  try {
    return await zeppGet<ZeppHeartRateData[]>('/user/heartrate/daily', token, { start_date: startDate, end_date: endDate });
  } catch { return []; }
}

async function fetchSports(token: ZeppToken, startDate: string, endDate: string): Promise<ZeppSportActivity[]> {
  try {
    return await zeppGet<ZeppSportActivity[]>('/user/sport/detail', token, { start_date: startDate, end_date: endDate });
  } catch { return []; }
}

// ─── Sync ─────────────────────────────────────────────────────────────────────

export interface ZeppSyncResult {
  snapshot: ZeppHealthSnapshot;
  normalized: DailyHealthData;
  workoutSessions: Array<{
    id: string; type: string; emoji: string; date: string;
    durationMin: number; calories: number; distanceKm?: number;
    avgHeartRate?: number; source: 'zepp';
  }>;
}

export async function syncZeppHealth(daysBack = 7): Promise<ZeppSyncResult> {
  const token = await refreshZeppToken();
  if (!token) throw new Error('Zepp not connected');

  const endDate   = new Date();
  const startDate = new Date(Date.now() - daysBack * 86_400_000);

  const startStr = formatZeppDate(startDate);
  const endStr   = formatZeppDate(endDate);
  const today    = formatZeppDate(endDate);

  const [stepsArr, sleepArr, hrArr, sportsArr] = await Promise.all([
    fetchSteps(token, startStr, endStr),
    fetchSleep(token, startStr, endStr),
    fetchHeartRate(token, startStr, endStr),
    fetchSports(token, startStr, endStr),
  ]);

  // Most recent data
  const todaySteps = stepsArr.find((s) => s.date === today) ?? stepsArr[stepsArr.length - 1];
  const todaySleep = sleepArr.find((s) => s.date === today) ?? sleepArr[sleepArr.length - 1];
  const todayHR    = hrArr.find((h) => h.date === today) ?? hrArr[hrArr.length - 1];

  const sleepHours = todaySleep
    ? (todaySleep.deepSleepMinutes + todaySleep.lightSleepMinutes + todaySleep.remSleepMinutes) / 60
    : 0;

  const normalized: DailyHealthData = {
    date: endDate.toISOString().split('T')[0],
    steps: todaySteps?.steps ?? 0,
    activeCalories: todaySteps?.calories ?? 0,
    totalCalories: (todaySteps?.calories ?? 0) + 1800,
    distanceKm: todaySteps ? parseFloat((todaySteps.distance / 1000).toFixed(2)) : 0,
    sleepHours: parseFloat(sleepHours.toFixed(1)),
    heartRateAvg: todayHR?.avgHeartRate ?? 0,
    heartRateResting: todayHR?.restingHeartRate ?? 0,
    standHours: 0,
    exerciseMin: Math.round((sportsArr.reduce((acc, s) => {
      const dur = s.endTime && s.startTime
        ? (new Date(s.endTime).getTime() - new Date(s.startTime).getTime()) / 60000
        : 0;
      return acc + dur;
    }, 0))),
    waterMl: 0,
    sleepScore: todaySleep?.sleepScore,
  };

  const workoutSessions = sportsArr.map((s, i) => {
    const sport = SPORT_TYPE_MAP[s.sportType] ?? { name: 'workout', emoji: '💪' };
    const durationMin = s.endTime && s.startTime
      ? Math.round((new Date(s.endTime).getTime() - new Date(s.startTime).getTime()) / 60000)
      : 0;
    return {
      id: `zepp_${i}_${s.startTime}`,
      type: sport.name,
      emoji: sport.emoji,
      date: new Date(s.startTime).toISOString().split('T')[0],
      durationMin,
      calories: s.calories,
      distanceKm: s.distance > 0 ? parseFloat((s.distance / 1000).toFixed(2)) : undefined,
      avgHeartRate: s.avgHeartRate,
      source: 'zepp' as const,
    };
  });

  const snapshot: ZeppHealthSnapshot = {
    date: endDate.toISOString().split('T')[0],
    steps: todaySteps,
    sleep: todaySleep,
    heartRate: todayHR,
    sports: sportsArr,
    syncedAt: new Date().toISOString(),
  };

  // Persist
  ensureDataDir();
  const updatedToken: ZeppToken = { ...token, syncedAt: snapshot.syncedAt };
  saveZeppToken(updatedToken);
  fs.writeFileSync(
    path.join(DATA_DIR, 'zepp-health.json'),
    JSON.stringify({ snapshot, normalized, workoutSessions }, null, 2),
    'utf-8'
  );

  return { snapshot, normalized, workoutSessions };
}

export function loadCachedZeppHealth(): ZeppSyncResult | null {
  const filePath = path.join(DATA_DIR, 'zepp-health.json');
  if (!fs.existsSync(filePath)) return null;
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf-8')) as ZeppSyncResult;
  } catch { return null; }
}

export function disconnectZepp(): void {
  if (fs.existsSync(TOKEN_FILE)) fs.rmSync(TOKEN_FILE);
}
