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
  try {
    const body = (await req.json()) as {
      userId?: string;
      gaps?: LifeGap[];
      context?: Record<string, unknown>;
    };

    const { userId, gaps, context = {} } = body;

    if (!userId) {
      return NextResponse.json({ error: 'userId é obrigatório' }, { status: 400 });
    }

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
      saveRequirementDoc(userId, doc);
    }

    return NextResponse.json({ docs });
  } catch (err) {
    console.error('[requirements/route] Error:', err);
    return NextResponse.json(
      { error: 'Erro ao gerar documentos de requisitos' },
      { status: 500 }
    );
  }
}
