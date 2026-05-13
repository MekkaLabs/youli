import { NextResponse } from 'next/server';
import { MemoryEngine } from '@youli/memory';

const engine = new MemoryEngine({
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
  supabaseKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  profileId: process.env.YOULI_PROFILE_ID,
  anthropicKey: process.env.ANTHROPIC_API_KEY,
});

// Carrega memórias do Supabase na inicialização (server-side singleton)
engine.loadFromSupabase().catch(console.error);

export async function GET(req: Request) {
  const url = new URL(req.url);
  const q = url.searchParams.get('q');
  if (q) {
    const results = await engine.search(q, 5);
    return NextResponse.json(results);
  }
  return NextResponse.json(engine.all());
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  if (!body.text) return NextResponse.json({ error: 'text obrigatório' }, { status: 400 });
  const record = await engine.add({
    id: `m-${Date.now()}`,
    userId: process.env.YOULI_PROFILE_ID || 'u1',
    type: body.type || 'fact',
    text: body.text,
    createdAt: new Date().toISOString(),
  });
  return NextResponse.json(record, { status: 201 });
}
