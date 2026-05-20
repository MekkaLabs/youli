/**
 * @youli/memory — MemoryEngine v3
 *
 * Camadas de memória (MiroFish-inspired):
 *   1. Zep Cloud → grafo temporal + relações cross-entidade (primário se configurado)
 *   2. pgvector (Supabase) → busca semântica por embeddings (fallback rico)
 *   3. In-memory cache → fallback sem banco (desenvolvimento)
 */

import {
  addZepMemory,
  searchZepMemory,
  getZepContext,
  addUserFact,
  getUserFacts,
  recordLifeCorrelation,
  getLifeCorrelations,
  ensureZepSession,
  ZepFact,
} from '../../../apps/api/src/services/memory/zep-memory';

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';
const EMBED_MODEL = 'claude-haiku-4-5-20251001';

export type MemoryOrigin = 'app' | 'agent' | 'voice' | 'obsidian' | 'import';

export interface MemoryEntry {
  id: string;
  content: string;
  area?: string;
  timestamp: Date;
  score?: number;
  /** Camada onde foi encontrado. */
  source: 'zep' | 'pgvector' | 'cache';
  /** Origem do dado (de onde veio antes de ser indexado). */
  origin?: MemoryOrigin;
  tags?: string[];
  externalId?: string;
}

export interface AddMemoryOptions {
  area?: string;
  /** Origem semântica (ex: 'obsidian' para nota do vault). */
  origin?: MemoryOrigin;
  /** ID externo (ex: caminho do .md). Usado para upsert idempotente. */
  externalId?: string;
  tags?: string[];
  /** Override do userId padrão. */
  userId?: string;
}

export interface SearchMemoryOptions {
  limit?: number;
  /** Filtrar resultados por origem. */
  origin?: MemoryOrigin;
}

export interface MemoryEngineOptions {
  supabaseUrl?: string;
  supabaseKey?: string;
  profileId?: string;
  anthropicKey?: string;
  zepApiKey?: string;
  userId?: string;
}

// ──────────────────────────────────────────────────────────
// In-memory cache (dev / sem banco)
// ──────────────────────────────────────────────────────────
interface CacheEntry {
  content: string;
  area: string;
  embedding?: number[];
  timestamp: Date;
  origin?: MemoryOrigin;
  externalId?: string;
  tags?: string[];
}

const memoryCache = new Map<string, CacheEntry[]>();

// ──────────────────────────────────────────────────────────
// CLASSE PRINCIPAL
// ──────────────────────────────────────────────────────────
export class MemoryEngine {
  private opts: MemoryEngineOptions;
  private supabase: any = null;
  private userId: string;

  constructor(opts: MemoryEngineOptions = {}) {
    this.opts = opts;
    this.userId = opts.userId || opts.profileId || 'default';
  }

  // ── INICIALIZAÇÃO ──────────────────────────────────────

  async init(): Promise<void> {
    // Inicializa Supabase se configurado
    if (this.opts.supabaseUrl && this.opts.supabaseKey) {
      try {
        const { createClient } = await import('@supabase/supabase-js');
        this.supabase = createClient(this.opts.supabaseUrl, this.opts.supabaseKey, {
          auth: { persistSession: false },
        });
      } catch {}
    }

    // Garante sessão Zep
    if (process.env.ZEP_API_KEY || this.opts.zepApiKey) {
      if (this.opts.zepApiKey) process.env.ZEP_API_KEY = this.opts.zepApiKey;
      await ensureZepSession(this.userId);
    }

    // Hidrata cache do Supabase
    await this.loadFromSupabase();
  }

  // ── ADD MEMORY ─────────────────────────────────────────

  /**
   * Adiciona uma memória. Aceita string (modo simples) ou objeto AddMemoryOptions
   * com metadata adicional (origin, externalId, tags). Quando `externalId` é
   * passado, faz upsert em pgvector e cache em vez de inserção duplicada.
   *
   * BACKWARD COMPAT: assinatura antiga `add(content, area)` continua funcionando.
   */
  async add(content: string, areaOrOpts: string | AddMemoryOptions = 'general'): Promise<void> {
    const timestamp = new Date();
    const opts: AddMemoryOptions =
      typeof areaOrOpts === 'string' ? { area: areaOrOpts } : areaOrOpts;
    const area = opts.area ?? 'general';
    const origin = opts.origin ?? 'app';
    const externalId = opts.externalId;
    const tags = opts.tags;
    const userId = opts.userId ?? this.userId;

    // 1. Zep (grafo temporal)
    await addZepMemory(userId, [
      {
        roleType: 'user',
        role: `youli-${area}`,
        content,
        metadata: {
          area,
          origin,
          externalId,
          tags,
          timestamp: timestamp.toISOString(),
        },
      },
    ]);

    // 2. pgvector (Supabase) com upsert por externalId quando informado
    if (this.supabase && this.opts.profileId) {
      try {
        const embedding = await this.embed(content);
        const payload = {
          profile_id: this.opts.profileId,
          content,
          area,
          embedding,
          origin,
          external_id: externalId ?? null,
          tags: tags ?? null,
          created_at: timestamp.toISOString(),
        };
        if (externalId) {
          // Tenta UPDATE primeiro. Se não bater nada, INSERT.
          const { data: updated } = await this.supabase
            .from('memories')
            .update(payload)
            .eq('profile_id', this.opts.profileId)
            .eq('external_id', externalId)
            .select('id');
          if (!updated || updated.length === 0) {
            await this.supabase.from('memories').insert(payload);
          }
        } else {
          await this.supabase.from('memories').insert(payload);
        }
      } catch (err) {
        // eslint-disable-next-line no-console
        console.warn('[Memory] Supabase upsert error:', err);
      }
    }

    // 3. In-memory cache (também idempotente por externalId quando informado)
    const key = userId;
    const entries = memoryCache.get(key) || [];
    if (externalId) {
      const idx = entries.findIndex((e) => e.externalId === externalId);
      const cacheEntry: CacheEntry = { content, area, timestamp, origin, externalId, tags };
      if (idx !== -1) entries[idx] = cacheEntry;
      else entries.push(cacheEntry);
    } else {
      entries.push({ content, area, timestamp, origin, tags });
    }
    if (entries.length > 200) entries.shift();
    memoryCache.set(key, entries);
  }

  // ── SEARCH ─────────────────────────────────────────────

  /**
   * Busca semântica nas 3 camadas. Aceita `limit` (number, backward compat)
   * ou `SearchMemoryOptions` com filtro por `origin` (ex: só notas do Obsidian).
   */
  async search(
    query: string,
    limitOrOpts: number | SearchMemoryOptions = 8,
  ): Promise<MemoryEntry[]> {
    const opts: SearchMemoryOptions =
      typeof limitOrOpts === 'number' ? { limit: limitOrOpts } : limitOrOpts;
    const limit = opts.limit ?? 8;
    const filterOrigin = opts.origin;

    const results: MemoryEntry[] = [];

    // 1. Zep (mais rico — grafo + relações)
    const zepResults = await searchZepMemory(this.userId, query, limit);
    for (const r of zepResults) {
      const meta = (r.fact as { metadata?: { origin?: MemoryOrigin; externalId?: string; tags?: string[] } }).metadata;
      results.push({
        id: r.fact.uuid || `zep-${Date.now()}`,
        content: r.fact.content,
        area: 'zep',
        timestamp: new Date(r.fact.created_at || Date.now()),
        score: r.score,
        source: 'zep',
        origin: meta?.origin,
        externalId: meta?.externalId,
        tags: meta?.tags,
      });
    }

    // 2. pgvector (Supabase) se Zep não retornou suficiente
    if (results.length < 3 && this.supabase && this.opts.profileId) {
      try {
        const embedding = await this.embed(query);
        const { data } = await this.supabase.rpc('match_memories', {
          query_embedding: embedding,
          match_count: Math.max(1, limit - results.length),
          profile_id: this.opts.profileId,
        });
        for (const row of data || []) {
          results.push({
            id: row.id,
            content: row.content,
            area: row.area,
            timestamp: new Date(row.created_at),
            score: row.similarity,
            source: 'pgvector',
            origin: (row.origin as MemoryOrigin | undefined) ?? undefined,
            externalId: row.external_id ?? undefined,
            tags: row.tags ?? undefined,
          });
        }
      } catch {}
    }

    // 3. Keyword fallback (cache)
    if (results.length === 0) {
      const lower = query.toLowerCase();
      const cached = memoryCache.get(this.userId) || [];
      const matched = cached
        .filter((e) => e.content.toLowerCase().includes(lower))
        .slice(-limit)
        .map((e, i) => ({
          id: `cache-${i}`,
          content: e.content,
          area: e.area,
          timestamp: e.timestamp,
          score: 0.5,
          source: 'cache' as const,
          origin: e.origin,
          externalId: e.externalId,
          tags: e.tags,
        }));
      results.push(...matched);
    }

    const filtered = filterOrigin ? results.filter((r) => r.origin === filterOrigin) : results;
    return filtered.sort((a, b) => (b.score || 0) - (a.score || 0)).slice(0, limit);
  }

  // ── CONTEXT ────────────────────────────────────────────

  /**
   * Contexto atual do usuário — resumo inteligente do Zep
   * Muito mais rico que busca vetorial pura
   */
  async getContext(): Promise<string> {
    const zepCtx = await getZepContext(this.userId);
    if (zepCtx) return zepCtx;

    // Fallback: últimas 5 memórias do cache
    const cached = memoryCache.get(this.userId) || [];
    return cached
      .slice(-5)
      .map((e) => `[${e.area}] ${e.content}`)
      .join('\n');
  }

  // ── CORRELAÇÕES (GraphRAG-lite) ────────────────────────

  async recordCorrelation(
    sourceArea: string,
    targetArea: string,
    description: string,
    strength: 'weak' | 'moderate' | 'strong' = 'moderate'
  ): Promise<void> {
    await recordLifeCorrelation(this.userId, sourceArea, targetArea, description, strength);
  }

  async getCorrelations(): Promise<ZepFact[]> {
    return getLifeCorrelations(this.userId);
  }

  // ── FACTS (User Knowledge Graph) ──────────────────────

  async addFact(fact: string, area: string): Promise<void> {
    await addUserFact(this.userId, fact, area);
  }

  async getFacts(query?: string): Promise<ZepFact[]> {
    return getUserFacts(this.userId, query);
  }

  // ── ROUTING CONTEXT (backward compat) ─────────────────

  async routeContext(area: string): Promise<string[]> {
    const results = await this.search(area, 5);
    return results.map((r) => r.content);
  }

  // ── INTERNAL ───────────────────────────────────────────

  private async embed(text: string): Promise<number[]> {
    const apiKey = process.env.ANTHROPIC_API_KEY || this.opts.anthropicKey;
    if (!apiKey) return [];

    try {
      const res = await fetch(ANTHROPIC_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: EMBED_MODEL,
          max_tokens: 4,
          messages: [{ role: 'user', content: `embed: ${text}` }],
        }),
      });
      // Claude não tem endpoint de embedding dedicado — usa hash determinístico
      // Em produção: substituir por text-embedding-3-small da OpenAI ou voyage-3
      return Array.from({ length: 1536 }, (_, i) =>
        Math.sin((text.charCodeAt(i % text.length) * (i + 1)) / 1000)
      );
    } catch {
      return [];
    }
  }

  private async loadFromSupabase(): Promise<void> {
    if (!this.supabase || !this.opts.profileId) return;
    try {
      const { data } = await this.supabase
        .from('memories')
        .select('content, area, created_at')
        .eq('profile_id', this.opts.profileId)
        .order('created_at', { ascending: false })
        .limit(100);

      const entries: CacheEntry[] = (data || []).map((r: any) => ({
        content: r.content,
        area: r.area || 'general',
        timestamp: new Date(r.created_at),
      }));
      memoryCache.set(this.userId, entries);
    } catch {}
  }
}

// Singleton
let _engine: MemoryEngine | null = null;

export function getMemoryEngine(): MemoryEngine {
  if (!_engine) {
    _engine = new MemoryEngine({
      supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
      supabaseKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
      profileId: process.env.YOULI_PROFILE_ID,
      anthropicKey: process.env.ANTHROPIC_API_KEY,
      zepApiKey: process.env.ZEP_API_KEY,
      userId: process.env.YOULI_PROFILE_ID || 'youli-user',
    });
  }
  return _engine;
}

export async function initMemoryEngine(): Promise<MemoryEngine> {
  const engine = getMemoryEngine();
  await engine.init();
  return engine;
}
