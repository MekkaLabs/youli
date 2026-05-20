// POST /api/copilot/evaluate-all
// Body: { userId: string, context: Record<string, unknown>, tokenBudgetPerArea?: number }
// Retorna: ParallelEvalResult
import { NextRequest, NextResponse } from 'next/server';
import { evaluateAllAreas, formatParallelResult } from '@/services/agents/parallel-evaluator';
import { jsonError, requireAuth } from '@/lib/http';

export async function POST(req: NextRequest) {
  const auth = await requireAuth();
  if (auth.error) return auth.response;
  try {
    const body = (await req.json().catch(() => ({}))) as {
      context?: Record<string, unknown>;
      tokenBudgetPerArea?: number;
    };
    const { context = {}, tokenBudgetPerArea } = body;

    const result = await evaluateAllAreas(auth.user.id, context, tokenBudgetPerArea);
    const formatted = formatParallelResult(result);

    return NextResponse.json({ ...result, formatted });
  } catch (err) {
    return jsonError('Erro ao avaliar áreas de vida', 500, err, 'POST /api/copilot/evaluate-all');
  }
}
