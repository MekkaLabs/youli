/**
 * GET  /api/agents/signals  → sinais pendentes para o usuário
 * POST /api/agents/signals  → processa sinais com contexto atual
 */
import { NextRequest, NextResponse } from 'next/server';
import { processSignals, getInMemorySignals } from '@/services/signals/agent-signal-bus';

export async function GET(req: NextRequest) {
  const profileId = req.nextUrl.searchParams.get('profileId') || 'default';
  const signals = getInMemorySignals(profileId);
  return NextResponse.json({ signals, total: signals.length });
}

export async function POST(req: NextRequest) {
  try {
    const { profileId = 'default', context = {} } = await req.json();
    const processed = await processSignals(profileId, context);
    return NextResponse.json({ signals: processed, total: processed.length });
  } catch (err) {
    return NextResponse.json({ error: 'Erro ao processar sinais' }, { status: 500 });
  }
}
