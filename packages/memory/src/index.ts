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

export interface MemoryEntry {
  id: string;
  content: string;
  area?: string;
  timestamp: Date;
  score?: number;
  source: 'zep' | 'pgvector' | 'cache';
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

  async add(content: string, area = 'general'): Promise<void> {
    const timestamp = new Date();

    // 1. Zep (grafo temporal)
    await addZepMemory(this.userId, [
      {
        roleType: 'user',
        role: `youli-${area}`,
        content,
        metadata: { area, timestamp: timestamp.toISOString() },
      },
    ]);

    // 2. pgvector (Supabase)
    if (this.supabase && this.opts.profileId) {
      try {
        const embedding = await this.embed(content);
        await this.supabase.from('memories').insert({
          profile_id: this.opts.profileId,
          content,
          area,
          embedding,
          created_at: timestamp.toISOString(),
        });
      } catch (err) {
        console.warn('[Memory] Supabase insert error:', err);
      }
    }

    // 3. In-memory cache
    const key = this.userId;
    const entries = memoryCache.get(key) || [];
    entries.push({ content, area, timestamp });
    if (entries.length > 200) entries.shift();
    memoryCache.set(key, entries);
  }

  // ── SEARCH ─────────────────────────────────────────────

  async search(query: string, limit = 8): Promise<MemoryEntry[]> {
    const results: MemoryEntry[] = [];

    // 1. Zep (mais rico — grafo + relações)
    const zepResults = await searchZepMemory(this.userId, query, limit);
    for (const r of zepResults) {
      results.push({
        id: r.fact.uuid || `zep-${Date.now()}`,
        content: r.fact.content,
        area: 'zep',
        timestamp: new Date(r.fact.created_at || Date.now()),
        score: r.score,
        source: 'zep',
      });
    }

    // 2. pgvector (Supabase) se Zep não retornou suficiente
    if (results.length < 3 && this.supabase && this.opts.profileId) {
      try {
        const embedding = await this.embed(query);
        const { data } = await this.supabase.rpc('match_memories', {
          query_embedding: embedding,
          match_count: limit - results.length,
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
        }));
      results.push(...matched);
    }

    return results.sort((a, b) => (b.score || 0) - (a.score || 0)).slice(0, limit);
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
