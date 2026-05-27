/**
 * GET  /api/agents/signals  → sinais pendentes para o usuário
 * POST /api/agents/signals  → processa sinais com contexto atual
 */
import { NextRequest, NextResponse } from 'next/server';
import { processSignals, getInMemorySignals } from '@/services/signals/agent-signal-bus';
import { requireAuth } from '@/lib/http';

export async function GET(_req: NextRequest) {
  const auth = await requireAuth();
  if (auth.error) return auth.response;
  const signals = getInMemorySignals(auth.user.id);
  return NextResponse.json({ signals, total: signals.length });
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth();
  if (auth.error) return auth.response;
  try {
    const { context = {} } = await req.json();
    // profileId vem SEMPRE do servidor (evita impersonação).
    const processed = await processSignals(auth.user.id, context);
    return NextResponse.json({ signals: processed, total: processed.length });
  } catch (err) {
    return NextResponse.json({ error: 'Erro ao processar sinais' }, { status: 500 });
  }
}
