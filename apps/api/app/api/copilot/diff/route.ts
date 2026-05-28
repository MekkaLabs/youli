import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { generateDiff } from '@/services/agents/life-diff';
import { parseJsonBody, requireAuth } from '@/lib/http';

const DiffSchema = z.object({
  area: z.string().min(1).max(64),
  before: z.record(z.string(), z.unknown()),
  after: z.record(z.string(), z.unknown()),
});

export async function POST(req: NextRequest) {
  const auth = await requireAuth();
  if (auth.error) return auth.response;
  const parsed = await parseJsonBody(req, DiffSchema);
  if (!parsed.ok) return parsed.response;
  try {
    const { area, before, after } = parsed.data;
    const diff = generateDiff(area, before, after);
    return NextResponse.json(diff);
  } catch (err) {
    return NextResponse.json({ error: 'Erro ao gerar diff' }, { status: 500 });
  }
}
