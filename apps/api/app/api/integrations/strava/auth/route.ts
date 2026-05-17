/**
 * GET /api/integrations/strava/auth
 * Redireciona para o OAuth2 do Strava
 */
import { NextRequest, NextResponse } from 'next/server';
import { getStravaAuthUrl } from '@/services/integrations/strava';

export async function GET(req: NextRequest) {
  const origin = new URL(req.url).origin;
  const redirectUri = `${origin}/api/integrations/strava/callback`;
  const authUrl = getStravaAuthUrl(redirectUri, 'youli');
  return NextResponse.redirect(authUrl);
}
