/**
 * GET /api/integrations/status
 * Retorna o status de conexão de todas as integrações disponíveis
 */
import { NextResponse } from 'next/server';
import { loadStravaToken, isStravaConnected } from '@/services/integrations/strava';
import { loadZeppToken, isZeppConnected } from '@/services/integrations/zepp';
import { requireAuth } from '@/lib/http';

export async function GET() {
  const auth = await requireAuth();
  if (auth.error) return auth.response;
  const userId = auth.user.id;
  const stravaToken = loadStravaToken(userId);
  const zeppToken   = loadZeppToken(userId);

  const status = {
    strava: {
      connected: isStravaConnected(userId),
      athleteName: stravaToken?.athleteName ?? null,
      syncedAt: stravaToken?.syncedAt ?? null,
      expiresAt: stravaToken?.expiresAt ?? null,
      isExpired: stravaToken ? Date.now() / 1000 > stravaToken.expiresAt : false,
    },
    zepp: {
      connected: isZeppConnected(userId),
      openId: zeppToken?.openId ?? null,
      syncedAt: zeppToken?.syncedAt ?? null,
      expiresAt: zeppToken?.expiresAt ?? null,
      isExpired: zeppToken ? Date.now() > zeppToken.expiresAt : false,
    },
    // Futuras integrações (roadmap global)
    whatsapp:       { connected: false, planned: true },
    googleCalendar: { connected: false, planned: true },
    googleFit:      { connected: false, planned: true },
    appleHealth:    { connected: false, planned: true },
    spotify:        { connected: false, planned: true },
    notion:         { connected: false, planned: true },
    slack:          { connected: false, planned: true },
  };

  return NextResponse.json(status);
}
