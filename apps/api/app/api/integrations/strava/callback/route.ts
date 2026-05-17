/**
 * GET /api/integrations/strava/callback
 * Recebe o code do OAuth2 do Strava e troca por token
 */
import { NextRequest, NextResponse } from 'next/server';
import { exchangeStravaCode } from '@/services/integrations/strava';

export async function GET(req: NextRequest) {
  const { searchParams, origin } = new URL(req.url);
  const code  = searchParams.get('code');
  const error = searchParams.get('error');

  if (error || !code) {
    return NextResponse.json(
      { ok: false, error: error ?? 'No code received from Strava' },
      { status: 400 }
    );
  }

  try {
    const redirectUri = `${origin}/api/integrations/strava/callback`;
    const token = await exchangeStravaCode(code, redirectUri);
    // Redirect mobile deep link or show success
    return NextResponse.json({
      ok: true,
      athleteId: token.athleteId,
      athleteName: token.athleteName,
      message: 'Strava conectado com sucesso!',
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
