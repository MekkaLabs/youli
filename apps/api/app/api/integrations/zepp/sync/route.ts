/**
 * POST /api/integrations/zepp/sync
 * Sincroniza dados de saúde do Zepp e alimenta o SWE-CI
 */
import { NextRequest, NextResponse } from 'next/server';
import { syncZeppHealth } from '@/services/integrations/zepp';
import { bridgeZeppToSWECI } from '@/services/integrations/fitness-bridge';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({})) as { userId?: string; daysBack?: number };
    const userId  = body.userId ?? 'default';
    const daysBack = body.daysBack ?? 7;

    const syncResult = await syncZeppHealth(daysBack);
    const bridge     = bridgeZeppToSWECI(userId, syncResult);

    return NextResponse.json({
      ok: true,
      date: syncResult.snapshot.date,
      syncedAt: syncResult.snapshot.syncedAt,
      today: syncResult.normalized,
      workoutsCount: syncResult.workoutSessions.length,
      sweci: bridge,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Sync error';
    const status = msg.includes('not connected') ? 401 : 500;
    return NextResponse.json({ ok: false, error: msg }, { status });
  }
}
