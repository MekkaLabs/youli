/**
 * GET  /api/agents/signals  → sinais pendentes para o usuário
 * POST /api/agents/signals  → processa sinais com contexto atual
 */
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { processSignals, getInMemorySignals } from '@/services/signals/agent-signal-bus';
import { parseJsonBody, requireAuth } from '@/lib/http';

const SignalsSchema = z.object({
  context: z.record(z.string(), z.unknown()).default({}),
});

export async function GET(_req: NextRequest) {
  const auth = await requireAuth();
  if (auth.error) return auth.response;
  const signals = getInMemorySignals(auth.user.id);
  return NextResponse.json({ signals, total: signals.length });
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth();
  if (auth.error) return auth.response;
  const parsed = await parseJsonBody(req, SignalsSchema);
  if (!parsed.ok) return parsed.response;
  try {
    // profileId vem SEMPRE do servidor (evita impersonação).
    const processed = await processSignals(auth.user.id, parsed.data.context);
    return NextResponse.json({ signals: processed, total: processed.length });
  } catch (err) {
    return NextResponse.json({ error: 'Erro ao processar sinais' }, { status: 500 });
  }
}
