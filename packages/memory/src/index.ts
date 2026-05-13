import type { MemoryRecord } from '@youli/shared';

// ─── Tipos ────────────────────────────────────────────────────────────────────
export interface MemorySearchResult extends MemoryRecord {
  similarity?: number;
}

export interface MemoryEngineOptions {
  supabaseUrl?: string;
  supabaseKey?: string;
  profileId?: string;
  anthropicKey?: string;
}

// ─── MemoryEngine (pgvector + fallback in-RAM) ────────────────────────────────
export class MemoryEngine {
  private records: MemoryRecord[] = [];
  private opts: MemoryEngineOptions;
  private supabase: any = null;

  constructor(opts: MemoryEngineOptions = {}) {
    this.opts = opts;
    this.initSupabase();
  }

  private initSupabase() {
    const { supabaseUrl, supabaseKey } = this.opts;
    if (!supabaseUrl || !supabaseKey) return;
    try {
      // Importação dinâmica para não quebrar quando não instalado
      const { createClient } = require('@supabase/supabase-js');
      this.supabase = createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false } });
    } catch {
      this.supabase = null;
    }
  }

  // ── Gerar embedding via Claude API ─────────────────────────────────────────
  private async embed(text: string): Promise<number[] | null> {
    const key = this.opts.anthropicKey;
    if (!key) return null;
    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'x-api-key': key, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 64,
          system: 'Retorne APENAS um array JSON de 1536 floats representando o embedding semântico do texto.',
          messages: [{ role: 'user', content: `Embedding para: "${text.slice(0, 500)}"` }],
        }),
      });
      if (!res.ok) return null;
      const data = await res.json();
      const txt = data?.content?.[0]?.text ?? '[]';
      return JSON.parse(txt);
    } catch {
      return null;
    }
  }

  // ── Adicionar memória ───────────────────────────────────────────────────────
  async add(record: MemoryRecord): Promise<MemoryRecord> {
    if (this.supabase && this.opts.profileId) {
      const embedding = await this.embed(record.text);
      const { data, error } = await this.supabase
        .from('memories')
        .insert({
          profile_id: this.opts.profileId,
          type: record.type,
          text: record.text,
          embedding: embedding ? JSON.stringify(embedding) : null,
          metadata: {},
        })
        .select()
        .single();
      if (!error && data) {
        const saved: MemoryRecord = { ...record, id: data.id };
        this.records.push(saved);
        return saved;
      }
    }
    // Fallback RAM
    this.records.push(record);
    return record;
  }

  // ── Busca semântica ─────────────────────────────────────────────────────────
  async search(query: string, limit = 5): Promise<MemorySearchResult[]> {
    if (this.supabase && this.opts.profileId) {
      const embedding = await this.embed(query);
      if (embedding) {
        const { data, error } = await this.supabase.rpc('match_memories', {
          query_embedding: JSON.stringify(embedding),
          profile_id_filter: this.opts.profileId,
          match_count: limit,
          match_threshold: 0.65,
        });
        if (!error && data?.length) {
          return data.map((r: any) => ({
            id: r.id, userId: this.opts.profileId!, type: r.type,
            text: r.text, createdAt: r.created_at, similarity: r.similarity,
          }));
        }
      }
    }
    // Fallback: busca por palavras-chave em RAM
    return this.keywordSearch(query, limit);
  }

  // ── Busca por palavras-chave (fallback) ─────────────────────────────────────
  routeContext(query: string, limit = 5): MemoryRecord[] {
    return this.keywordSearch(query, limit);
  }

  private keywordSearch(query: string, limit: number): MemoryRecord[] {
    const q = query.toLowerCase();
    const tokens = q.split(/\s+/).filter(Boolean);
    return this.records
      .map(r => ({ r, score: tokens.reduce((acc, t) => r.text.toLowerCase().includes(t) ? acc + 1 : acc, 0) }))
      .filter(x => x.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map(x => x.r);
  }

  all(): MemoryRecord[] { return this.records; }

  // ── Carregar memórias existentes do Supabase na inicialização ───────────────
  async loadFromSupabase(): Promise<void> {
    if (!this.supabase || !this.opts.profileId) return;
    const { data } = await this.supabase
      .from('memories')
      .select('id, type, text, created_at')
      .eq('profile_id', this.opts.profileId)
      .order('created_at', { ascending: false })
      .limit(100);
    if (data) {
      this.records = data.map((r: any) => ({
        id: r.id, userId: this.opts.profileId!, type: r.type, text: r.text, createdAt: r.created_at,
      }));
    }
  }
}
