import { NextRequest, NextResponse } from 'next/server';
import { MemoryEngine } from '@youli/memory';
import { getMemoryConnector } from '@/services/kernel/memory-connectors';
import type { MemoryRecord } from '@youli/shared';
import { requireAdminScope } from '@/lib/admin-scope';

const engine = new MemoryEngine({
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
  supabaseKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  profileId: process.env.YOULI_PROFILE_ID,
  anthropicKey: process.env.ANTHROPIC_API_KEY,
});

export async function GET(req: NextRequest) {
  const auth = requireAdminScope(req);
  if (auth) return auth;
  const url = new URL(req.url);
  const q = url.searchParams.get('q') ?? '';
  try {
    const connector = getMemoryConnector();
    const local = await connector.list(120);
    // search com string vazia retorna as memórias mais recentes
    const results = await engine.search(q || 'vida', 20);
    return NextResponse.json({ vector: results, local });
  } catch {
    const connector = getMemoryConnector();
    const local = await connector.list(120);
    return NextResponse.json({ vector: [], local }, { status: 200 });
  }
}

export async function POST(req: NextRequest) {
  const auth = requireAdminScope(req);
  if (auth) return auth;
  const body = await req.json().catch(() => ({}));
  if (!body.text) return NextResponse.json({ error: 'text obrigatório' }, { status: 400 });
  try {
    const connector = getMemoryConnector();
    const record: MemoryRecord = {
      id: `mem_${Date.now()}`,
      userId: process.env.YOULI_PROFILE_ID || 'u1',
      type: body.type || 'fact',
      text: String(body.text),
      score: typeof body.score === 'number' ? body.score : 0.6,
      createdAt: new Date().toISOString(),
    };
    await connector.add(record);
    await engine.add(body.text, body.area || 'general');
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
