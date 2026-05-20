/**
 * GET  /api/memory?q=...&source=obsidian&limit=20  — busca memórias do usuário
 * POST /api/memory                                  — cria/atualiza memória
 *
 * Suporta:
 *  - filtro por `source` (app|agent|voice|obsidian|import)
 *  - filtro por `area`
 *  - upsert por `externalId` (idempotente — útil para sync Obsidian)
 *  - tags
 *
 * Auth: cookie de sessão (requireAuth). Antes usava requireAdminScope,
 * o que impedia o app de gravar memória própria. Cada usuário enxerga e
 * grava sua própria memória; admin scope foi removido.
 */
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { MemoryEngine } from '@youli/memory';
import { getMemoryConnector } from '@/services/kernel/memory-connectors';
import type { MemoryRecord, MemorySource } from '@youli/shared';
import { jsonError, parseJsonBody, requireAuth } from '@/lib/http';

export const runtime = 'nodejs';

const engine = new MemoryEngine({
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
  supabaseKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  profileId: process.env.YOULI_PROFILE_ID,
  anthropicKey: process.env.ANTHROPIC_API_KEY,
});

const MemorySourceEnum = z.enum(['app', 'agent', 'voice', 'obsidian', 'import']);
const MemoryTypeEnum = z.enum(['fact', 'pattern', 'event', 'preference']);

const CreateMemorySchema = z.object({
  text: z.string().min(1, 'text obrigatório').max(20_000),
  type: MemoryTypeEnum.optional(),
  area: z.string().min(1).max(64).optional(),
  source: MemorySourceEnum.optional(),
  externalId: z.string().min(1).max(512).optional(),
  tags: z.array(z.string().min(1).max(64)).max(32).optional(),
  score: z.number().min(0).max(1).optional(),
});

export async function GET(req: NextRequest) {
  const auth = await requireAuth();
  if (auth.error) return auth.response;

  const url = new URL(req.url);
  const q = url.searchParams.get('q') ?? '';
  const sourceParam = url.searchParams.get('source');
  const area = url.searchParams.get('area') ?? undefined;
  const tagsParam = url.searchParams.get('tags');
  const limit = Math.min(200, Math.max(1, parseInt(url.searchParams.get('limit') ?? '40', 10)));

  const sourceFilter = MemorySourceEnum.safeParse(sourceParam);
  const source = sourceFilter.success ? sourceFilter.data : undefined;
  const tags = tagsParam ? tagsParam.split(',').map((s) => s.trim()).filter(Boolean) : undefined;

  try {
    const connector = getMemoryConnector();
    const local = await connector.list({
      userId: auth.user.id,
      limit,
      source,
      area,
      tags,
    });

    // Busca semântica só se o usuário forneceu query.
    let vector: Awaited<ReturnType<typeof engine.search>> = [];
    if (q) {
      vector = await engine.search(q, { limit, origin: source });
    }

    return NextResponse.json({ vector, local });
  } catch (err) {
    return jsonError('Erro ao buscar memórias', 500, err, 'GET /api/memory');
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth();
  if (auth.error) return auth.response;

  const parsed = await parseJsonBody(req, CreateMemorySchema);
  if (!parsed.ok) return parsed.response;
  const body = parsed.data;

  try {
    const connector = getMemoryConnector();
    const source = (body.source ?? 'app') as MemorySource;
    const record: MemoryRecord = {
      id: body.externalId
        ? `mem_${source}_${hash(body.externalId)}`
        : `mem_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      userId: auth.user.id,
      type: body.type ?? 'fact',
      text: body.text,
      score: body.score ?? 0.6,
      createdAt: new Date().toISOString(),
      source,
      externalId: body.externalId,
      tags: body.tags,
      area: body.area,
    };

    const upsertResult = await connector.upsert(record);
    await engine.add(body.text, {
      area: body.area ?? 'general',
      origin: source,
      externalId: body.externalId,
      tags: body.tags,
      userId: auth.user.id,
    });

    return NextResponse.json(
      { ok: true, action: upsertResult.action, id: upsertResult.record.id },
      { status: upsertResult.action === 'created' ? 201 : 200 },
    );
  } catch (err) {
    return jsonError('Erro ao gravar memória', 500, err, 'POST /api/memory');
  }
}

// Hash determinístico simples — sem dep externa. Usa FNV-1a 32-bit hex.
function hash(input: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = (h + ((h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24))) >>> 0;
  }
  return h.toString(16).padStart(8, '0');
}
