import { NextRequest, NextResponse } from 'next/server';
import { buildArchitectPlan, savePlan, formatPlanForResponse } from '@/services/agents/architect-mode';

export async function POST(req: NextRequest) {
  try {
    const { goal, context = {}, userId = 'default' } = await req.json();
    if (!goal) return NextResponse.json({ error: 'goal é obrigatório' }, { status: 400 });
    const plan = await buildArchitectPlan(goal, context);
    savePlan(plan, userId);
    return NextResponse.json({ plan, formatted: formatPlanForResponse(plan) });
  } catch (err) {
    console.error('[architect] Error:', err);
    return NextResponse.json({ error: 'Erro ao gerar plano' }, { status: 500 });
  }
}
