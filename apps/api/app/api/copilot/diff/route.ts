import { NextRequest, NextResponse } from 'next/server';
import { generateDiff } from '@/services/agents/life-diff';
import { requireAuth } from '@/lib/http';

export async function POST(req: NextRequest) {
  const auth = await requireAuth();
  if (auth.error) return auth.response;
  try {
    const { area, before, after } = await req.json();
    if (!area || !before || !after) {
      return NextResponse.json(
        { error: 'area, before e after são obrigatórios' },
        { status: 400 }
      );
    }
    const diff = generateDiff(area, before, after);
    return NextResponse.json(diff);
  } catch (err) {
    return NextResponse.json({ error: 'Erro ao gerar diff' }, { status: 500 });
  }
}
