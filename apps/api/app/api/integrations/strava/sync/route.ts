/**
 * POST /api/integrations/strava/sync
 * Sincroniza atividades do Strava e alimenta o SWE-CI Evolution Tracker
 */
import { NextRequest, NextResponse } from 'next/server';
import { syncStravaActivities } from '@/services/integrations/strava';
import { bridgeStravaToSWECI } from '@/services/integrations/fitness-bridge';
import { logError, requireAuth } from '@/lib/http';

export async function POST(req: NextRequest) {
  const auth = await requireAuth();
  if (auth.error) return auth.response;
  try {
    const body = await req.json().catch(() => ({})) as { daysBack?: number };
    const daysBack = body.daysBack ?? 30;
    const userId = auth.user.id;

    const syncResult = await syncStravaActivities(userId, daysBack);
    const bridge = bridgeStravaToSWECI(userId, syncResult);

    return NextResponse.json({
      ok: true,
      activitiesCount: syncResult.activitiesCount,
      syncedAt: syncResult.syncedAt,
      sweci: bridge,
    });
  } catch (err) {
    logError('POST /api/integrations/strava/sync', err);
    const msg = err instanceof Error ? err.message : 'Sync error';
    const status = msg.includes('not connected') ? 401 : 500;
    return NextResponse.json({ ok: false, error: msg }, { status });
  }
}
