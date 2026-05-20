/**
 * GET /api/integrations/strava/auth
 * Inicia o OAuth2 do Strava para o USUÁRIO LOGADO.
 * O userId viaja no `state` (assinado, curto) para reidentificar no callback.
 */
import { NextRequest, NextResponse } from 'next/server';
import { getStravaAuthUrl } from '@/services/integrations/strava';
import { signOAuthState } from '@/services/auth';
import { requireAuth } from '@/lib/http';

export async function GET(req: NextRequest) {
  const auth = await requireAuth();
  if (auth.error) return auth.response;

  const origin = new URL(req.url).origin;
  const redirectUri = `${origin}/api/integrations/strava/callback`;
  const state = signOAuthState(auth.user.id);
  const authUrl = getStravaAuthUrl(redirectUri, state);
  return NextResponse.redirect(authUrl);
}
