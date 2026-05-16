// POST /api/copilot/attribution
// Body: { userId, area, failedItem, context }
// Retorna: { attribution: FailureAttribution, preventionPlan: string[] }

import { NextRequest, NextResponse } from 'next/server';
import {
  attributeFailureWithAI,
  generatePreventionPlan,
} from '@/services/agents/failure-attribution';

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      userId?: string;
      area?: string;
      failedItem?: string;
      context?: Record<string, unknown>;
    };

    const { userId, area, failedItem, context = {} } = body;

    if (!userId) {
      return NextResponse.json({ error: 'userId é obrigatório' }, { status: 400 });
    }

    if (!area) {
      return NextResponse.json({ error: 'area é obrigatória' }, { status: 400 });
    }

    if (!failedItem) {
      return NextResponse.json({ error: 'failedItem é obrigatório' }, { status: 400 });
    }

    const attribution = await attributeFailureWithAI(area, failedItem, context);
    const preventionPlan = generatePreventionPlan(attribution);

    return NextResponse.json({ attribution, preventionPlan });
  } catch (err) {
    console.error('[attribution/route] Error:', err);
    return NextResponse.json(
      { error: 'Erro ao atribuir falha' },
      { status: 500 }
    );
  }
}
