/**
 * POST /api/evolution/record
 * Registra um ponto de evolução (focus session, habit checkin, goal update, etc.)
 * Persiste no Supabase quando configurado, senão no evolution tracker em memória.
 */
import { NextRequest, NextResponse } from 'next/server';
import { recordEvolutionPoint } from '@/services/agents/life-evolution-tracker';
import { supabase, hasSupabase } from '@/db/supabase';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const {
      userId = 'default',
      area = 'productivity',
      type = 'general',
      value = 1,
      label = '',
      ts,
    } = body;

    // 1. Persiste no Supabase se disponível
    if (hasSupabase()) {
      await supabase!.from('evolution_points').insert({
        profile_id: userId === 'default' ? (process.env.YOULI_PROFILE_ID || 'user-1') : userId,
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
    console.error('[evolution/record]', err);
    return NextResponse.json({ error: 'Erro ao registrar ponto de evolução' }, { status: 500 });
  }
}
