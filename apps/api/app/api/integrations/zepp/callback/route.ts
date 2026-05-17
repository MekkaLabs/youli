/**
 * GET /api/integrations/zepp/callback
 * Recebe o code OAuth2 da Zepp e troca por token de acesso
 */
import { NextRequest, NextResponse } from 'next/server';
import { exchangeZeppCode } from '@/services/integrations/zepp';

export async function GET(req: NextRequest) {
  const { searchParams, origin } = new URL(req.url);
  const code  = searchParams.get('code');
  const error = searchParams.get('error');

  if (error || !code) {
    return NextResponse.json(
      { ok: false, error: error ?? 'No code received from Zepp' },
      { status: 400 }
    );
  }

  try {
    const redirectUri = `${origin}/api/integrations/zepp/callback`;
    const token = await exchangeZeppCode(code, redirectUri);
    return NextResponse.json({
      ok: true,
      openId: token.openId,
      message: 'Zepp Health conectado com sucesso!',
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
