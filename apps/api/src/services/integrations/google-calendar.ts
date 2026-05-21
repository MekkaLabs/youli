/**
 * Google Calendar Integration Service
 * OAuth2 Web Server flow (per-user) + events sync.
 * Docs: https://developers.google.com/identity/protocols/oauth2/web-server
 *       https://developers.google.com/calendar/api/v3/reference/events/list
 */
import fs from 'node:fs';
import path from 'node:path';
import type { CalendarEvent } from '@youli/shared';

// ─── Constants ───────────────────────────────────────────────────────────────

const GOOGLE_AUTH_URL  = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GOOGLE_REVOKE_URL = 'https://oauth2.googleapis.com/revoke';
const CALENDAR_API = 'https://www.googleapis.com/calendar/v3';
const SCOPE = 'https://www.googleapis.com/auth/calendar.readonly';

const DATA_DIR   = path.join(process.cwd(), 'src', 'repositories', '.data');
const GOOGLE_DIR = path.join(DATA_DIR, 'google');

// ─── Types ───────────────────────────────────────────────────────────────────

export interface GoogleToken {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;   // epoch ms
  scope?: string;
  email?: string;
  syncedAt?: string;
}

interface GoogleEvent {
  id: string;
  summary?: string;
  start?: { dateTime?: string; date?: string };
  end?: { dateTime?: string; date?: string };
  status?: string;
}

// ─── Token storage (por usuário) ───────────────────────────────────────────────

function safeId(userId: string): string {
  return userId.replace(/[^a-zA-Z0-9_-]/g, '_');
}
function tokenFile(userId: string): string {
  return path.join(GOOGLE_DIR, `${safeId(userId)}-token.json`);
}
function ensureDir() {
  if (!fs.existsSync(GOOGLE_DIR)) fs.mkdirSync(GOOGLE_DIR, { recursive: true });
}

export function loadGoogleToken(userId: string): GoogleToken | null {
  const file = tokenFile(userId);
  if (!fs.existsSync(file)) return null;
  try {
    return JSON.parse(fs.readFileSync(file, 'utf-8')) as GoogleToken;
  } catch { return null; }
}

function saveGoogleToken(userId: string, token: GoogleToken) {
  ensureDir();
  fs.writeFileSync(tokenFile(userId), JSON.stringify(token, null, 2), 'utf-8');
}

export function isGoogleConnected(userId: string): boolean {
  return loadGoogleToken(userId) !== null;
}

// ─── OAuth2 ──────────────────────────────────────────────────────────────────

export function getGoogleAuthUrl(redirectUri: string, state: string): string {
  const clientId = process.env.GOOGLE_CLIENT_ID ?? '';
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: SCOPE,
    access_type: 'offline',   // necessário para receber refresh_token
    prompt: 'consent',        // garante refresh_token mesmo em reconexões
    include_granted_scopes: 'true',
    state,
  });
  return `${GOOGLE_AUTH_URL}?${params.toString()}`;
}

export async function exchangeGoogleCode(
  code: string,
  redirectUri: string,
  userId: string
): Promise<GoogleToken> {
  const clientId     = process.env.GOOGLE_CLIENT_ID ?? '';
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET ?? '';

  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    }).toString(),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Google token exchange failed: ${err}`);
  }

  const data = await res.json() as {
    access_token: string;
    refresh_token?: string;
    expires_in: number;
    scope?: string;
  };

  const token: GoogleToken = {
    accessToken: data.access_token,
    refreshToken: data.refresh_token ?? '',
    expiresAt: Date.now() + data.expires_in * 1000,
    scope: data.scope,
  };

  saveGoogleToken(userId, token);
  return token;
}

export async function refreshGoogleToken(userId: string): Promise<GoogleToken | null> {
  const current = loadGoogleToken(userId);
  if (!current) return null;

  // Ainda válido (buffer de 60s)
  if (Date.now() < current.expiresAt - 60_000) return current;
  if (!current.refreshToken) return null;

  const clientId     = process.env.GOOGLE_CLIENT_ID ?? '';
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET ?? '';

  const res = await fetch(GOOGLE_TOKEN_URL, {
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

  const data = await res.json() as { access_token: string; expires_in: number; refresh_token?: string };
  const refreshed: GoogleToken = {
    ...current,
    accessToken: data.access_token,
    expiresAt: Date.now() + data.expires_in * 1000,
    // O Google geralmente NÃO reenvia refresh_token no refresh — preserva o atual.
    refreshToken: data.refresh_token ?? current.refreshToken,
  };
  saveGoogleToken(userId, refreshed);
  return refreshed;
}

// ─── Sync ──────────────────────────────────────────────────────────────────────

export interface GoogleCalendarSyncResult {
  eventsCount: number;
  events: CalendarEvent[];
  syncedAt: string;
}

function normalizeEvent(e: GoogleEvent): CalendarEvent | null {
  const startsAt = e.start?.dateTime ?? (e.start?.date ? `${e.start.date}T00:00:00.000Z` : undefined);
  const endsAt   = e.end?.dateTime ?? (e.end?.date ? `${e.end.date}T00:00:00.000Z` : undefined);
  if (!startsAt || !endsAt) return null;
  return {
    id: `gcal_${e.id}`,
    source: 'google',
    title: e.summary ?? '(sem título)',
    startsAt,
    endsAt,
  };
}

/**
 * Busca eventos do calendário primário do usuário (janela: daysBack..daysAhead)
 * e devolve normalizados. Não persiste — quem chama decide onde gravar.
 */
export async function syncGoogleCalendar(
  userId: string,
  daysBack = 7,
  daysAhead = 30
): Promise<GoogleCalendarSyncResult> {
  const token = await refreshGoogleToken(userId);
  if (!token) throw new Error('Google Calendar not connected');

  const timeMin = new Date(Date.now() - daysBack * 86_400_000).toISOString();
  const timeMax = new Date(Date.now() + daysAhead * 86_400_000).toISOString();

  const qs = new URLSearchParams({
    timeMin,
    timeMax,
    singleEvents: 'true',
    orderBy: 'startTime',
    maxResults: '50',
  });

  const res = await fetch(`${CALENDAR_API}/calendars/primary/events?${qs}`, {
    headers: { Authorization: `Bearer ${token.accessToken}` },
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Google Calendar API: HTTP ${res.status} — ${err}`);
  }

  const body = await res.json() as { items?: GoogleEvent[] };
  const events = (body.items ?? [])
    .filter((e) => e.status !== 'cancelled')
    .map(normalizeEvent)
    .filter((e): e is CalendarEvent => e !== null);

  const syncedAt = new Date().toISOString();
  saveGoogleToken(userId, { ...token, syncedAt });

  return { eventsCount: events.length, events, syncedAt };
}

export async function disconnectGoogle(userId: string): Promise<void> {
  const token = loadGoogleToken(userId);
  if (token) {
    try {
      await fetch(GOOGLE_REVOKE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ token: token.refreshToken || token.accessToken }).toString(),
      });
    } catch { /* best-effort */ }
  }
  const tf = tokenFile(userId);
  if (fs.existsSync(tf)) fs.rmSync(tf);
}
