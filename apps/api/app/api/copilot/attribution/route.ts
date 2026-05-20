// POST /api/copilot/attribution
// Body: { userId, area, failedItem, context }
// Retorna: { attribution: FailureAttribution, preventionPlan: string[] }

import { NextRequest, NextResponse } from 'next/server';
import {
  attributeFailureWithAI,
  generatePreventionPlan,
} from '@/services/agents/failure-attribution';
import { jsonError, requireAuth } from '@/lib/http';

export async function POST(req: NextRequest) {
  const auth = await requireAuth();
  if (auth.error) return auth.response;
  try {
    const body = (await req.json().catch(() => ({}))) as {
      area?: string;
      failedItem?: string;
      context?: Record<string, unknown>;
    };

    const { area, failedItem, context = {} } = body;

    if (!area) {
      return NextResponse.json({ error: 'area é obrigatória' }, { status: 400 });
    }

    if (!failedItem) {
      return NextResponse.json({ error: 'failedItem é obrigatório' }, { status: 400 });
    }

    const attribution = await attributeFailureWithAI(area, failedItem, context);
    const preventionPlan = generatePreventionPlan(attribution);

    return NextResponse.json({ attribution, preventionPlan, userId: auth.user.id });
  } catch (err) {
    return jsonError('Erro ao atribuir falha', 500, err, 'POST /api/copilot/attribution');
  }
}
