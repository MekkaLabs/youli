// POST /api/copilot/requirements
// Body: { userId, gaps: LifeGap[], context: Record<string, unknown> }
// Retorna: { docs: LifeRequirementDoc[] }
// Gera um doc por gap (até 5 gaps)

import { NextRequest, NextResponse } from 'next/server';
import {
  generateRequirementDocWithAI,
  saveRequirementDoc,
  type LifeRequirementDoc,
} from '@/services/agents/requirements-doc-generator';
import { jsonError, requireAuth } from '@/lib/http';

interface LifeGap {
  area: string;
  metric: string;
  currentValue: number | string;
  targetValue: number | string;
  gapMagnitude: number;
  priority: string;
  requirement: string;
  estimatedDays: number;
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth();
  if (auth.error) return auth.response;
  try {
    const body = (await req.json().catch(() => ({}))) as {
      gaps?: LifeGap[];
      context?: Record<string, unknown>;
    };

    const { gaps, context = {} } = body;

    if (!Array.isArray(gaps) || gaps.length === 0) {
      return NextResponse.json(
        { error: 'gaps deve ser um array não vazio' },
        { status: 400 }
      );
    }

    const limitedGaps = gaps.slice(0, 5);

    const docs: LifeRequirementDoc[] = await Promise.all(
      limitedGaps.map((gap) => generateRequirementDocWithAI(gap, context))
    );

    for (const doc of docs) {
      saveRequirementDoc(auth.user.id, doc);
    }

    return NextResponse.json({ docs });
  } catch (err) {
    return jsonError('Erro ao gerar documentos de requisitos', 500, err, 'POST /api/copilot/requirements');
  }
}
