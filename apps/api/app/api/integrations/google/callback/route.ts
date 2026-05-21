/**
 * GET /api/integrations/google/callback
 * Recebe o code do OAuth2 do Google, valida o state (userId) e troca por token.
 */
import { NextRequest, NextResponse } from 'next/server';
import { exchangeGoogleCode } from '@/services/integrations/google-calendar';
import { verifyOAuthState } from '@/services/auth';

export async function GET(req: NextRequest) {
  const { searchParams, origin } = new URL(req.url);
  const code  = searchParams.get('code');
  const error = searchParams.get('error');
  const state = searchParams.get('state');

  if (error || !code) {
    return NextResponse.json(
      { ok: false, error: error ?? 'No code received from Google' },
      { status: 400 }
    );
  }

  const userId = state ? verifyOAuthState(state) : null;
  if (!userId) {
    return NextResponse.json(
      { ok: false, error: 'state inválido ou expirado — reinicie a conexão pelo app.' },
      { status: 400 }
    );
  }

  try {
    const redirectUri = `${origin}/api/integrations/google/callback`;
    await exchangeGoogleCode(code, redirectUri, userId);
    return NextResponse.redirect(`${origin}/system/calendario?google=connected`);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
