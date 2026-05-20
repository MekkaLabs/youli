/**
 * GET /api/fitness/summary
 * Agrega dados de Strava + Zepp em um único payload para o useHealth do mobile
 */
import { NextResponse } from 'next/server';
import { buildFitnessSummary } from '@/services/integrations/fitness-bridge';
import { jsonError, requireAuth } from '@/lib/http';

export async function GET() {
  const auth = await requireAuth();
  if (auth.error) return auth.response;
  try {
    const summary = buildFitnessSummary(auth.user.id);
    return NextResponse.json(summary);
  } catch (err) {
    return jsonError('Erro ao agregar dados de fitness', 500, err, 'GET /api/fitness/summary');
  }
}
