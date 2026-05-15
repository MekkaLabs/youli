# API Standards — Youli

## Stack
- Next.js 15 App Router (TypeScript)
- All routes: `apps/api/app/api/[route]/route.ts`
- Supabase (DB + auth + realtime + pgvector)
- Anthropic Claude API (`@anthropic-ai/sdk`)

## Route Pattern
```ts
// apps/api/app/api/[feature]/route.ts
import { NextResponse } from 'next/server';

export async function GET(req: Request) {
  try {
    // logic
    return NextResponse.json({ data });
  } catch (e) {
    return NextResponse.json({ error: 'message' }, { status: 500 });
  }
}
```

## Supabase
- Client: `import { supabase } from '@/lib/supabase'`
- Always handle errors: `const { data, error } = await supabase.from(...)`
- pgvector for memory/embeddings: `life_memories` table

## Claude API
```ts
import Anthropic from '@anthropic-ai/sdk';
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const response = await anthropic.messages.create({
  model: 'claude-opus-4-6',   // or claude-sonnet-4-6, claude-haiku-4-5
  max_tokens: 1024,
  messages: [{ role: 'user', content: prompt }],
});
```

## Multi-Agent (Squads)
- OrquestradorService: `apps/api/src/services/OrquestradorService.ts`
- Signal Bus: Supabase Realtime (`agent_signals` table)
- Squad agents: specialized by life area (health, finance, habits, goals, etc.)
- API routes for squads: `apps/api/app/api/squads/[agent]/route.ts`
