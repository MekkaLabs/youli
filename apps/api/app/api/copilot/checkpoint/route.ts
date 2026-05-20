// GET /api/copilot/checkpoint?userId=xxx — detectInactiveGoals
// POST /api/copilot/checkpoint — createCheckpoint
// PATCH /api/copilot/checkpoint — markResumed
// Body: { userId, goal?, goalId?, context, inactivityDays? }
import { NextRequest, NextResponse } from 'next/server';
import {
  createCheckpoint,
  saveCheckpoint,
  detectInactiveGoals,
  markResumed,
} from '@/services/agents/goal-checkpoint';
import { jsonError, requireAuth } from '@/lib/http';

export async function GET(req: NextRequest) {
  const auth = await requireAuth();
  if (auth.error) return auth.response;
  try {
    const { searchParams } = new URL(req.url);
    const inactivityDays = parseInt(searchParams.get('inactivityDays') ?? '14', 10);
    const inactive = detectInactiveGoals(auth.user.id, inactivityDays);
    return NextResponse.json({ userId: auth.user.id, inactiveGoals: inactive, count: inactive.length });
  } catch (err) {
    return jsonError('Erro ao detectar metas inativas', 500, err, 'GET /api/copilot/checkpoint');
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth();
  if (auth.error) return auth.response;
  try {
    const body = (await req.json().catch(() => ({}))) as {
      goal?: { id: string; title: string; progress: number };
      context?: Record<string, unknown>;
      phase?: 'initiated' | 'in_progress' | 'blocked' | 'resumed' | 'completed' | 'abandoned';
    };
    const { goal, context = {}, phase } = body;

    if (!goal) {
      return NextResponse.json({ error: 'goal é obrigatório' }, { status: 400 });
    }

    const checkpoint = createCheckpoint(auth.user.id, goal, context, phase);
    saveCheckpoint(checkpoint);
    return NextResponse.json({ checkpoint });
  } catch (err) {
    return jsonError('Erro ao criar checkpoint', 500, err, 'POST /api/copilot/checkpoint');
  }
}

export async function PATCH(req: NextRequest) {
  const auth = await requireAuth();
  if (auth.error) return auth.response;
  try {
    const body = (await req.json().catch(() => ({}))) as {
      goalId?: string;
      context?: Record<string, unknown>;
    };
    const { goalId, context = {} } = body;

    if (!goalId) {
      return NextResponse.json({ error: 'goalId é obrigatório' }, { status: 400 });
    }

    const resumed = markResumed(auth.user.id, goalId, context);
    if (!resumed) {
      return NextResponse.json(
        { error: 'Nenhum checkpoint encontrado para este goal' },
        { status: 404 }
      );
    }

    return NextResponse.json({ checkpoint: resumed });
  } catch (err) {
    return jsonError('Erro ao marcar meta como retomada', 500, err, 'PATCH /api/copilot/checkpoint');
  }
}
