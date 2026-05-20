/**
 * POST /api/evolution/record
 * Registra um ponto de evolução (focus session, habit checkin, goal update, etc.)
 * Persiste no Supabase quando configurado, senão no evolution tracker em memória.
 */
import { NextRequest, NextResponse } from 'next/server';
import { recordEvolutionPoint } from '@/services/agents/life-evolution-tracker';
import { supabase, hasSupabase } from '@/db/supabase';
import { jsonError, requireAuth } from '@/lib/http';

export async function POST(req: NextRequest) {
  const auth = await requireAuth();
  if (auth.error) return auth.response;
  try {
    const body = await req.json().catch(() => ({}));
    const {
      area = 'productivity',
      type = 'general',
      value = 1,
      label = '',
      ts,
    } = body;
    const userId = auth.user.id;

    // 1. Persiste no Supabase se disponível
    if (hasSupabase()) {
      await supabase!.from('evolution_points').insert({
        profile_id: userId,
        area,
        metric: type,
        value,
        label,
        ts: ts || new Date().toISOString(),
      });
    }

    // 2. Sempre registra no tracker em memória (alimenta life-health score)
    recordEvolutionPoint(userId, area, type, Number(value));

    return NextResponse.json({ ok: true, area, metric: type, value });
  } catch (err) {
    return jsonError('Erro ao registrar ponto de evolução', 500, err, 'POST /api/evolution/record');
  }
}
