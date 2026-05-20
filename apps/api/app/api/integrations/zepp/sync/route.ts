/**
 * POST /api/integrations/zepp/sync
 * Sincroniza dados de saúde do Zepp e alimenta o SWE-CI
 */
import { NextRequest, NextResponse } from 'next/server';
import { syncZeppHealth } from '@/services/integrations/zepp';
import { bridgeZeppToSWECI } from '@/services/integrations/fitness-bridge';
import { logError, requireAuth } from '@/lib/http';

export async function POST(req: NextRequest) {
  const auth = await requireAuth();
  if (auth.error) return auth.response;
  try {
    const body = await req.json().catch(() => ({})) as { daysBack?: number };
    const daysBack = body.daysBack ?? 7;
    const userId = auth.user.id;

    const syncResult = await syncZeppHealth(userId, daysBack);
    const bridge = bridgeZeppToSWECI(userId, syncResult);

    return NextResponse.json({
      ok: true,
      date: syncResult.snapshot.date,
      syncedAt: syncResult.snapshot.syncedAt,
      today: syncResult.normalized,
      workoutsCount: syncResult.workoutSessions.length,
      sweci: bridge,
    });
  } catch (err) {
    logError('POST /api/integrations/zepp/sync', err);
    const msg = err instanceof Error ? err.message : 'Sync error';
    const status = msg.includes('not connected') ? 401 : 500;
    return NextResponse.json({ ok: false, error: msg }, { status });
  }
}
