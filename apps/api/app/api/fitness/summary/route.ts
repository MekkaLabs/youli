/**
 * GET /api/fitness/summary
 * Agrega dados de Strava + Zepp em um único payload para o useHealth do mobile
 */
import { NextResponse } from 'next/server';
import { buildFitnessSummary } from '@/services/integrations/fitness-bridge';

export async function GET() {
  try {
    const summary = buildFitnessSummary();
    return NextResponse.json(summary);
  } catch (err) {
    console.error('[fitness/summary]', err);
    return NextResponse.json({ error: 'Erro ao agregar dados de fitness' }, { status: 500 });
  }
}
