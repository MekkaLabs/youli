/**
 * GET /api/integrations/zepp/auth
 * Redireciona para o OAuth2 da Zepp Health Platform
 */
import { NextRequest, NextResponse } from 'next/server';
import { getZeppAuthUrl } from '@/services/integrations/zepp';
import { signOAuthState } from '@/services/auth';
import { requireAuth } from '@/lib/http';

export async function GET(req: NextRequest) {
  const auth = await requireAuth();
  if (auth.error) return auth.response;

  const origin = new URL(req.url).origin;
  const redirectUri = `${origin}/api/integrations/zepp/callback`;
  const state = signOAuthState(auth.user.id);
  const authUrl = getZeppAuthUrl(redirectUri, state);
  return NextResponse.redirect(authUrl);
}
