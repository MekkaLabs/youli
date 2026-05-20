/**
 * GET /api/integrations/zepp/callback
 * Recebe o code OAuth2 da Zepp e troca por token de acesso
 */
import { NextRequest, NextResponse } from 'next/server';
import { exchangeZeppCode } from '@/services/integrations/zepp';
import { verifyOAuthState } from '@/services/auth';

export async function GET(req: NextRequest) {
  const { searchParams, origin } = new URL(req.url);
  const code  = searchParams.get('code');
  const error = searchParams.get('error');
  const state = searchParams.get('state');

  if (error || !code) {
    return NextResponse.json(
      { ok: false, error: error ?? 'No code received from Zepp' },
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
    const redirectUri = `${origin}/api/integrations/zepp/callback`;
    await exchangeZeppCode(code, redirectUri, userId);
    return NextResponse.redirect(`${origin}/system/fitness?zepp=connected`);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
