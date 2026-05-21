/**
 * GET /api/integrations/google/auth
 * Inicia o OAuth2 do Google Calendar para o USUÁRIO LOGADO.
 * O userId viaja no `state` (assinado, curto) para reidentificar no callback.
 */
import { NextRequest, NextResponse } from 'next/server';
import { getGoogleAuthUrl } from '@/services/integrations/google-calendar';
import { signOAuthState } from '@/services/auth';
import { requireAuth } from '@/lib/http';

export async function GET(req: NextRequest) {
  const auth = await requireAuth();
  if (auth.error) return auth.response;

  const origin = new URL(req.url).origin;
  const redirectUri = `${origin}/api/integrations/google/callback`;
  const state = signOAuthState(auth.user.id);
  return NextResponse.redirect(getGoogleAuthUrl(redirectUri, state));
}
