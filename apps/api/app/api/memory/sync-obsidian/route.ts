/**
 * POST /api/memory/sync-obsidian
 *
 * Recebe um batch de notas do vault Obsidian e faz upsert idempotente.
 * Cada nota é identificada por `externalId` (tipicamente o caminho relativo
 * do .md no vault, ex: "10 Projects/youli-mvp.md").
 *
 * Auth: requireAuth (cookie de sessão). O script de sync precisa estar
 * logado para conseguir gravar — use `YOULI_SYNC_COOKIE` no .env do script.
 *
 * Body:
 *  {
 *    "vault": "youli-obsidian",                  // opcional, só pra log
 *    "notes": [
 *      {
 *        "externalId": "10 Projects/youli-mvp.md",
 *        "text": "conteúdo da nota...",
 *        "area": "metas",                        // opcional
 *        "tags": ["projeto", "youli"],           // opcional
 *        "modifiedAt": "2026-05-19T10:00:00Z"    // opcional, só pra log
 *      },
 *      ...
 *    ]
 *  }
 *
 * Limites:
 *  - Máximo 200 notas por requisição (para limitar latência do batch)
 *  - Texto até 20.000 chars por nota
 *
 * Resposta:
 *  {
 *    ok: true,
 *    vault: "youli-obsidian",
 *    summary: { created: N, updated: M, skipped: K, errors: E },
 *    results: [{ externalId, action: 'created'|'updated'|'skipped'|'error', error?: string }]
 *  }
 */
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { MemoryEngine } from '@youli/memory';
import { getMemoryConnector } from '@/services/kernel/memory-connectors';
import type { MemoryRecord } from '@youli/shared';
import { jsonError, logError, parseJsonBody, requireAuth } from '@/lib/http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const engine = new MemoryEngine({
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
  supabaseKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  profileId: process.env.YOULI_PROFILE_ID,
  anthropicKey: process.env.ANTHROPIC_API_KEY,
});

const NoteSchema = z.object({
  externalId: z.string().min(1).max(512),
  text: z.string().max(20_000),
  area: z.string().min(1).max(64).optional(),
  tags: z.array(z.string().min(1).max(64)).max(32).optional(),
  type: z.enum(['fact', 'pattern', 'event', 'preference']).optional(),
  modifiedAt: z.string().optional(),
});

const SyncSchema = z.object({
  vault: z.string().optional(),
  notes: z.array(NoteSchema).min(1).max(200),
});

interface NoteResult {
  externalId: string;
  action: 'created' | 'updated' | 'skipped' | 'error';
  error?: string;
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth();
  if (auth.error) return auth.response;

  const parsed = await parseJsonBody(req, SyncSchema);
  if (!parsed.ok) return parsed.response;
  const { vault, notes } = parsed.data;

  const connector = getMemoryConnector();
  const results: NoteResult[] = [];
  let created = 0;
  let updated = 0;
  let skipped = 0;
  let errors = 0;

  const startedAt = Date.now();

  for (const note of notes) {
    try {
      const trimmed = note.text.trim();
      if (!trimmed) {
        results.push({ externalId: note.externalId, action: 'skipped', error: 'empty content' });
        skipped++;
        continue;
      }

      const record: MemoryRecord = {
        id: `mem_obsidian_${hash(`${auth.user.id}:${note.externalId}`)}`,
        userId: auth.user.id,
        type: note.type ?? 'fact',
        text: trimmed.slice(0, 20_000),
        score: 0.7,
        createdAt: new Date().toISOString(),
        source: 'obsidian',
        externalId: note.externalId,
        tags: note.tags,
        area: note.area,
      };

      const up = await connector.upsert(record);
      if (up.action === 'created') created++;
      else updated++;

      // Indexação semântica (Zep + pgvector + cache)
      await engine.add(record.text, {
        area: record.area ?? 'general',
        origin: 'obsidian',
        externalId: record.externalId,
        tags: record.tags,
        userId: auth.user.id,
      });

      results.push({ externalId: note.externalId, action: up.action });
    } catch (err) {
      errors++;
      const message = err instanceof Error ? err.message : 'unknown';
      logError('POST /api/memory/sync-obsidian', err, { externalId: note.externalId });
      results.push({ externalId: note.externalId, action: 'error', error: message });
    }
  }

  const elapsedMs = Date.now() - startedAt;

  try {
    return NextResponse.json({
      ok: true,
      vault: vault ?? null,
      userId: auth.user.id,
      summary: { created, updated, skipped, errors, total: notes.length, elapsedMs },
      results,
    });
  } catch (err) {
    return jsonError('Erro ao construir resposta de sync', 500, err, 'POST /api/memory/sync-obsidian');
  }
}

// FNV-1a 32-bit hex — sem dep externa.
function hash(input: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = (h + ((h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24))) >>> 0;
  }
  return h.toString(16).padStart(8, '0');
}
