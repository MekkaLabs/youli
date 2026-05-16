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

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId') ?? 'default';
    const inactivityDays = parseInt(searchParams.get('inactivityDays') ?? '14', 10);
    const inactive = detectInactiveGoals(userId, inactivityDays);
    return NextResponse.json({ userId, inactiveGoals: inactive, count: inactive.length });
  } catch (err) {
    console.error('[checkpoint GET] Error:', err);
    return NextResponse.json(
      { error: 'Erro ao detectar metas inativas' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      userId = 'default',
      goal,
      context = {},
      phase,
    } = body as {
      userId?: string;
      goal?: { id: string; title: string; progress: number };
      context?: Record<string, unknown>;
      phase?: 'initiated' | 'in_progress' | 'blocked' | 'resumed' | 'completed' | 'abandoned';
    };

    if (!goal) {
      return NextResponse.json({ error: 'goal é obrigatório' }, { status: 400 });
    }

    const checkpoint = createCheckpoint(userId, goal, context, phase);
    saveCheckpoint(checkpoint);
    return NextResponse.json({ checkpoint });
  } catch (err) {
    console.error('[checkpoint POST] Error:', err);
    return NextResponse.json(
      { error: 'Erro ao criar checkpoint' },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      userId = 'default',
      goalId,
      context = {},
    } = body as {
      userId?: string;
      goalId?: string;
      context?: Record<string, unknown>;
    };

    if (!goalId) {
      return NextResponse.json({ error: 'goalId é obrigatório' }, { status: 400 });
    }

    const resumed = markResumed(userId, goalId, context);
    if (!resumed) {
      return NextResponse.json(
        { error: 'Nenhum checkpoint encontrado para este goal' },
        { status: 404 }
      );
    }

    return NextResponse.json({ checkpoint: resumed });
  } catch (err) {
    console.error('[checkpoint PATCH] Error:', err);
    return NextResponse.json(
      { error: 'Erro ao marcar meta como retomada' },
      { status: 500 }
    );
  }
}
