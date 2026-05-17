/**
 * POST /api/integrations/strava/sync
 * Sincroniza atividades do Strava e alimenta o SWE-CI Evolution Tracker
 */
import { NextRequest, NextResponse } from 'next/server';
import { syncStravaActivities } from '@/services/integrations/strava';
import { bridgeStravaToSWECI } from '@/services/integrations/fitness-bridge';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({})) as { userId?: string; daysBack?: number };
    const userId  = body.userId ?? 'default';
    const daysBack = body.daysBack ?? 30;

    const syncResult = await syncStravaActivities(daysBack);
    const bridge     = bridgeStravaToSWECI(userId, syncResult);

    return NextResponse.json({
      ok: true,
      activitiesCount: syncResult.activitiesCount,
      syncedAt: syncResult.syncedAt,
      sweci: bridge,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Sync error';
    const status = msg.includes('not connected') ? 401 : 500;
    return NextResponse.json({ ok: false, error: msg }, { status });
  }
}
