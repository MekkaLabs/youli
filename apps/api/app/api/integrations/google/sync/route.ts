/**
 * POST /api/integrations/google/sync
 * Sincroniza eventos do Google Calendar do usuário logado para o calendário Youli.
 * Body opcional: { daysBack?: number; daysAhead?: number }
 */
import { NextRequest, NextResponse } from 'next/server';
import { syncGoogleCalendar } from '@/services/integrations/google-calendar';
import { upsertCalendarEvents } from '@/repositories/life-stream';
import { logError, requireAuth } from '@/lib/http';

export async function POST(req: NextRequest) {
  const auth = await requireAuth();
  if (auth.error) return auth.response;
  try {
    const body = await req.json().catch(() => ({})) as { daysBack?: number; daysAhead?: number };
    const result = await syncGoogleCalendar(auth.user.id, body.daysBack ?? 7, body.daysAhead ?? 30);
    upsertCalendarEvents(auth.user.id, result.events);

    return NextResponse.json({
      ok: true,
      eventsCount: result.eventsCount,
      syncedAt: result.syncedAt,
    });
  } catch (err) {
    logError('POST /api/integrations/google/sync', err);
    const msg = err instanceof Error ? err.message : 'Sync error';
    const status = msg.includes('not connected') ? 401 : 500;
    return NextResponse.json({ ok: false, error: msg }, { status });
  }
}
