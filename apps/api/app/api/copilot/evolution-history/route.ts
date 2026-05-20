/**
 * GET /api/copilot/evolution-history
 * Retorna histórico de evolução por área e métrica.
 *
 * Query params:
 *   userId  — default: "default"
 *   area    — filtra por área específica (opcional, "all" retorna tudo)
 *   days    — janela de dias (default: 30)
 */
import { NextRequest, NextResponse } from 'next/server';
import {
  getAllEvolutions,
  analyzeEvolution,
  loadEvolutionStore,
  type EvolutionSequence,
} from '@/services/agents/life-evolution-tracker';
import { jsonError, requireAuth } from '@/lib/http';

export interface EvolutionHistoryPayload {
  userId: string;
  requestedAt: string;
  days: number;
  area: string;
  sequences: EvolutionSequence[];
  totalPoints: number;
  areasWithData: string[];
}

export async function GET(req: NextRequest) {
  const auth = await requireAuth();
  if (auth.error) return auth.response;
  const userId = auth.user.id;
  const { searchParams } = new URL(req.url);
  const area = searchParams.get('area') ?? 'all';
  const days = Math.min(365, Math.max(7, parseInt(searchParams.get('days') ?? '30', 10)));

  try {
    let sequences: EvolutionSequence[];

    if (area === 'all') {
      sequences = getAllEvolutions(userId, days);
    } else {
      // For a specific area, get all metrics in that area
      const store = loadEvolutionStore(userId);
      const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

      const metrics = new Set<string>();
      for (const p of store.points) {
        if (p.area === area && p.timestamp >= cutoff) {
          metrics.add(p.metric);
        }
      }

      sequences = [];
      for (const metric of metrics) {
        const seq = analyzeEvolution(userId, area, metric, days);
        if (seq.points.length >= 2) sequences.push(seq);
      }
    }

    // Collect all areas that have data
    const store = loadEvolutionStore(userId);
    const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
    const areasWithData = [...new Set(
      store.points.filter((p) => p.timestamp >= cutoff).map((p) => p.area)
    )].sort();

    const payload: EvolutionHistoryPayload = {
      userId,
      requestedAt: new Date().toISOString(),
      days,
      area,
      sequences: sequences.sort((a, b) => b.points.length - a.points.length),
      totalPoints: store.points.filter((p) => p.timestamp >= cutoff).length,
      areasWithData,
    };

    return NextResponse.json(payload);
  } catch (err) {
    return jsonError('Erro ao carregar histórico de evolução', 500, err, 'GET /api/copilot/evolution-history');
  }
}

/**
 * POST /api/copilot/evolution-history
 * Registra um ponto de evolução manualmente.
 * Body: { userId, area, metric, value, tag? }
 */
import { recordEvolutionPoint } from '@/services/agents/life-evolution-tracker';

export async function POST(req: NextRequest) {
  const auth = await requireAuth();
  if (auth.error) return auth.response;
  try {
    const body = (await req.json().catch(() => ({}))) as {
      area?: string;
      metric?: string;
      value?: number;
      tag?: 'checkin' | 'ci_loop' | 'manual' | 'auto';
    };

    if (!body.area || !body.metric || typeof body.value !== 'number') {
      return NextResponse.json(
        { error: 'area, metric e value são obrigatórios' },
        { status: 400 }
      );
    }

    const point = recordEvolutionPoint(
      auth.user.id,
      body.area,
      body.metric,
      body.value,
      body.tag ?? 'manual'
    );

    return NextResponse.json({ ok: true, point });
  } catch (err) {
    return jsonError('Erro ao registrar ponto de evolução', 500, err, 'POST /api/copilot/evolution-history');
  }
}
