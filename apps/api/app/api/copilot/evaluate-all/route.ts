// POST /api/copilot/evaluate-all
// Body: { userId: string, context: Record<string, unknown>, tokenBudgetPerArea?: number }
// Retorna: ParallelEvalResult
import { NextRequest, NextResponse } from 'next/server';
import { evaluateAllAreas, formatParallelResult } from '@/services/agents/parallel-evaluator';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      userId = 'default',
      context = {},
      tokenBudgetPerArea,
    } = body as {
      userId?: string;
      context?: Record<string, unknown>;
      tokenBudgetPerArea?: number;
    };

    const result = await evaluateAllAreas(userId, context, tokenBudgetPerArea);
    const formatted = formatParallelResult(result);

    return NextResponse.json({ ...result, formatted });
  } catch (err) {
    console.error('[evaluate-all POST] Error:', err);
    return NextResponse.json(
      { error: 'Erro ao avaliar áreas de vida' },
      { status: 500 }
    );
  }
}
