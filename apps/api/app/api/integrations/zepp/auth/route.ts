/**
 * GET /api/integrations/zepp/auth
 * Redireciona para o OAuth2 da Zepp Health Platform
 */
import { NextRequest, NextResponse } from 'next/server';
import { getZeppAuthUrl } from '@/services/integrations/zepp';

export async function GET(req: NextRequest) {
  const origin = new URL(req.url).origin;
  const redirectUri = `${origin}/api/integrations/zepp/callback`;
  const authUrl = getZeppAuthUrl(redirectUri, 'youli');
  return NextResponse.redirect(authUrl);
}
