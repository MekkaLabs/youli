/**
 * Strava Integration Service
 * OAuth2 Authorization Code flow + Activity sync
 * Docs: https://developers.strava.com/docs/authentication/
 */
import fs from 'node:fs';
import path from 'node:path';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface StravaToken {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;      // Unix timestamp
  athleteId: number;
  athleteName: string;
  syncedAt?: string;
}

export interface StravaActivity {
  id: number;
  name: string;
  type: string;           // Run, Ride, Swim, WeightTraining, etc.
  sport_type: string;
  start_date: string;     // ISO 8601
  elapsed_time: number;   // seconds
  moving_time: number;    // seconds
  distance: number;       // meters
  total_elevation_gain: number;
  average_heartrate?: number;
  max_heartrate?: number;
  average_speed?: number; // m/s
  calories?: number;
  kudos_count: number;
}

export interface StravaAthlete {
  id: number;
  firstname: string;
  lastname: string;
  profile: string;        // avatar URL
  city: string;
  country: string;
}

export interface WorkoutSession {
  id: string;
  type: string;
  emoji: string;
  date: string;
  durationMin: number;
  calories: number;
  distanceKm?: number;
  avgHeartRate?: number;
  source: 'strava';
  raw?: StravaActivity;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const STRAVA_AUTH_URL = 'https://www.strava.com/oauth/authorize';
const STRAVA_TOKEN_URL = 'https://www.strava.com/oauth/token';
const STRAVA_API_BASE  = 'https://www.strava.com/api/v3';

const DATA_DIR = path.join(process.cwd(), 'src', 'repositories', '.data');
const STRAVA_DIR = path.join(DATA_DIR, 'strava');

function safeId(userId: string): string {
  return userId.replace(/[^a-zA-Z0-9_-]/g, '_');
}
function tokenFile(userId: string): string {
  return path.join(STRAVA_DIR, `${safeId(userId)}-token.json`);
}
function activitiesFile(userId: string): string {
  return path.join(STRAVA_DIR, `${safeId(userId)}-activities.json`);
}

const SPORT_EMOJI: Record<string, string> = {
  Run: '🏃', Ride: '🚴', Swim: '🏊', WeightTraining: '🏋️',
  Yoga: '🧘', Hike: '🥾', Walk: '🚶', Workout: '💪',
  Ski: '⛷️', Snowboard: '🏂', Soccer: '⚽', Tennis: '🎾',
  Rowing: '🚣', Crossfit: '🔥', EBikeRide: '🛵', MountainBikeRide: '🚵',
};

// ─── Token Storage ────────────────────────────────────────────────────────────

function ensureDir() {
  if (!fs.existsSync(STRAVA_DIR)) fs.mkdirSync(STRAVA_DIR, { recursive: true });
}

export function loadStravaToken(userId: string): StravaToken | null {
  const file = tokenFile(userId);
  if (!fs.existsSync(file)) return null;
  try {
    return JSON.parse(fs.readFileSync(file, 'utf-8')) as StravaToken;
  } catch { return null; }
}

function saveStravaToken(userId: string, token: StravaToken) {
  ensureDir();
  fs.writeFileSync(tokenFile(userId), JSON.stringify(token, null, 2), 'utf-8');
}

export function isStravaConnected(userId: string): boolean {
  return loadStravaToken(userId) !== null;
}

// ─── OAuth2 Flow ──────────────────────────────────────────────────────────────

export function getStravaAuthUrl(redirectUri: string, state?: string): string {
  const clientId = process.env.STRAVA_CLIENT_ID ?? '';
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    approval_prompt: 'auto',
    scope: 'read,activity:read_all,profile:read_all',
    ...(state ? { state } : {}),
  });
  return `${STRAVA_AUTH_URL}?${params.toString()}`;
}

export async function exchangeStravaCode(
  code: string,
  redirectUri: string,
  userId: string
): Promise<StravaToken> {
  const clientId     = process.env.STRAVA_CLIENT_ID ?? '';
  const clientSecret = process.env.STRAVA_CLIENT_SECRET ?? '';

  // Strava exige application/x-www-form-urlencoded (não JSON).
  const res = await fetch(STRAVA_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      code,
      grant_type: 'authorization_code',
      // redirect_uri não é exigido pela troca de token do Strava, mas é aceito.
      redirect_uri: redirectUri,
    }).toString(),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Strava token exchange failed: ${err}`);
  }

  const data = await res.json() as {
    access_token: string;
    refresh_token: string;
    expires_at: number;
    athlete: StravaAthlete;
  };

  const token: StravaToken = {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt: data.expires_at,
    athleteId: data.athlete.id,
    athleteName: `${data.athlete.firstname} ${data.athlete.lastname}`,
  };

  saveStravaToken(userId, token);
  return token;
}

export async function refreshStravaToken(userId: string): Promise<StravaToken | null> {
  const current = loadStravaToken(userId);
  if (!current) return null;

  // Token still valid
  if (Date.now() / 1000 < current.expiresAt - 60) return current;

  const clientId     = process.env.STRAVA_CLIENT_ID ?? '';
  const clientSecret = process.env.STRAVA_CLIENT_SECRET ?? '';

  const res = await fetch(STRAVA_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: current.refreshToken,
      grant_type: 'refresh_token',
    }).toString(),
  });

  if (!res.ok) return null;

  const data = await res.json() as {
    access_token: string;
    refresh_token: string;
    expires_at: number;
  };

  const refreshed: StravaToken = {
    ...current,
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt: data.expires_at,
  };

  saveStravaToken(userId, refreshed);
  return refreshed;
}

// ─── Activity Sync ────────────────────────────────────────────────────────────

async function stravaGet<T>(endpoint: string, token: StravaToken): Promise<T> {
  const res = await fetch(`${STRAVA_API_BASE}${endpoint}`, {
    headers: { Authorization: `Bearer ${token.accessToken}` },
  });
  if (!res.ok) throw new Error(`Strava API ${endpoint}: HTTP ${res.status}`);
  return res.json() as Promise<T>;
}

function normalizeActivity(a: StravaActivity): WorkoutSession {
  const sportType = a.sport_type ?? a.type ?? 'Workout';
  const emoji = SPORT_EMOJI[sportType] ?? SPORT_EMOJI[a.type] ?? '🏃';

  return {
    id: `strava_${a.id}`,
    type: sportType.toLowerCase(),
    emoji,
    date: a.start_date.split('T')[0],
    durationMin: Math.round(a.moving_time / 60),
    calories: a.calories ?? Math.round(a.moving_time / 60 * 7),
    distanceKm: a.distance > 0 ? parseFloat((a.distance / 1000).toFixed(2)) : undefined,
    avgHeartRate: a.average_heartrate,
    source: 'strava',
    raw: a,
  };
}

export interface StravaSyncResult {
  activitiesCount: number;
  activities: WorkoutSession[];
  athleteId: number;
  syncedAt: string;
}

export async function syncStravaActivities(
  userId: string,
  daysBack = 30
): Promise<StravaSyncResult> {
  const token = await refreshStravaToken(userId);
  if (!token) throw new Error('Strava not connected');

  const after = Math.floor(Date.now() / 1000 - daysBack * 86400);
  const activities = await stravaGet<StravaActivity[]>(
    `/athlete/activities?after=${after}&per_page=50`,
    token
  );

  const sessions = activities.map(normalizeActivity);

  // Persist sync timestamp
  const updated: StravaToken = {
    ...token,
    syncedAt: new Date().toISOString(),
  };
  saveStravaToken(userId, updated);

  // Save activities to per-user snapshot
  ensureDir();
  fs.writeFileSync(
    activitiesFile(userId),
    JSON.stringify({ updatedAt: updated.syncedAt, sessions }, null, 2),
    'utf-8'
  );

  return {
    activitiesCount: sessions.length,
    activities: sessions,
    athleteId: token.athleteId,
    syncedAt: updated.syncedAt!,
  };
}

export function loadCachedStravaActivities(userId: string): WorkoutSession[] {
  const filePath = activitiesFile(userId);
  if (!fs.existsSync(filePath)) return [];
  try {
    const { sessions } = JSON.parse(fs.readFileSync(filePath, 'utf-8')) as { sessions: WorkoutSession[] };
    return sessions ?? [];
  } catch { return []; }
}

/**
 * Desconecta o Strava do usuário: revoga o token no Strava (best-effort) e
 * remove os arquivos locais (token + cache de atividades).
 */
export async function disconnectStrava(userId: string): Promise<void> {
  const token = loadStravaToken(userId);
  if (token) {
    try {
      await fetch('https://www.strava.com/oauth/deauthorize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ access_token: token.accessToken }).toString(),
      });
    } catch { /* best-effort: segue removendo localmente */ }
  }
  const tf = tokenFile(userId);
  const af = activitiesFile(userId);
  if (fs.existsSync(tf)) fs.rmSync(tf);
  if (fs.existsSync(af)) fs.rmSync(af);
}
