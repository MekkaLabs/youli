import { NextResponse } from 'next/server';
import { MemoryEngine } from '@youli/memory';

const engine = new MemoryEngine({
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
  supabaseKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  profileId: process.env.YOULI_PROFILE_ID,
  anthropicKey: process.env.ANTHROPIC_API_KEY,
});

export async function GET(req: Request) {
  const url = new URL(req.url);
  const q = url.searchParams.get('q') ?? '';
  try {
    // search com string vazia retorna as memórias mais recentes
    const results = await engine.search(q || 'vida', 20);
    return NextResponse.json(results);
  } catch {
    return NextResponse.json([], { status: 200 });
  }
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  if (!body.text) return NextResponse.json({ error: 'text obrigatório' }, { status: 400 });
  try {
    await engine.add(body.text, body.area || 'general');
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
