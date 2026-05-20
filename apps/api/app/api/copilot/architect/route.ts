import { NextRequest, NextResponse } from 'next/server';
import { buildArchitectPlan, savePlan, formatPlanForResponse } from '@/services/agents/architect-mode';
import { jsonError, requireAuth } from '@/lib/http';

export async function POST(req: NextRequest) {
  const auth = await requireAuth();
  if (auth.error) return auth.response;
  try {
    const body = (await req.json().catch(() => ({}))) as {
      goal?: string;
      context?: Record<string, unknown>;
    };
    const { goal, context = {} } = body;
    if (!goal) return NextResponse.json({ error: 'goal é obrigatório' }, { status: 400 });
    const plan = await buildArchitectPlan(goal, context);
    savePlan(plan, auth.user.id);
    return NextResponse.json({ plan, formatted: formatPlanForResponse(plan) });
  } catch (err) {
    return jsonError('Erro ao gerar plano', 500, err, 'POST /api/copilot/architect');
  }
}
