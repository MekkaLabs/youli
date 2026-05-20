/**
 * GET /api/integrations/strava/callback
 * Recebe o code do OAuth2 do Strava e troca por token
 */
import { NextRequest, NextResponse } from 'next/server';
import { exchangeStravaCode } from '@/services/integrations/strava';
import { verifyOAuthState } from '@/services/auth';

export async function GET(req: NextRequest) {
  const { searchParams, origin } = new URL(req.url);
  const code  = searchParams.get('code');
  const error = searchParams.get('error');
  const state = searchParams.get('state');

  if (error || !code) {
    return NextResponse.json(
      { ok: false, error: error ?? 'No code received from Strava' },
      { status: 400 }
    );
  }

  // O state assinado identifica QUAL usuário está conectando.
  const userId = state ? verifyOAuthState(state) : null;
  if (!userId) {
    return NextResponse.json(
      { ok: false, error: 'state inválido ou expirado — reinicie a conexão pelo app.' },
      { status: 400 }
    );
  }

  try {
    const redirectUri = `${origin}/api/integrations/strava/callback`;
    await exchangeStravaCode(code, redirectUri, userId);
    // Sucesso → volta para o cockpit web (fitness).
    return NextResponse.redirect(`${origin}/system/fitness?strava=connected`);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
