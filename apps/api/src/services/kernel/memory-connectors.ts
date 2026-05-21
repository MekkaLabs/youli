import { readDb, writeDb } from '../../repositories/local-db';
import { supabase, hasSupabase } from '../../db/supabase';
import type { MemoryRecord, MemorySource } from '@youli/shared';

export interface ListMemoryOptions {
  limit?: number;
  /** Filtrar por origem (ex: 'obsidian' para só notas do vault). */
  source?: MemorySource;
  /** Filtrar por usuário. */
  userId?: string;
  /** Filtrar por tags (match em qualquer uma das tags fornecidas). */
  tags?: string[];
  /** Filtrar por área. */
  area?: string;
}

export interface UpsertResult {
  /** 'created' se foi inserção nova, 'updated' se já existia e foi atualizado. */
  action: 'created' | 'updated';
  record: MemoryRecord;
}

export interface MemoryConnector {
  add(record: MemoryRecord): Promise<void>;
  /**
   * Upsert idempotente. Se `record.externalId` estiver setado e já existir
   * outro record com o mesmo `(userId, externalId)`, atualiza em vez de inserir.
   */
  upsert(record: MemoryRecord): Promise<UpsertResult>;
  list(opts?: ListMemoryOptions): Promise<MemoryRecord[]>;
  /** Remove um registro por id. Retorna true se removeu, false se não existia. */
  remove(userId: string, id: string): Promise<boolean>;
}

class LocalMemoryConnector implements MemoryConnector {
  async add(record: MemoryRecord) {
    const db = readDb(record.userId);
    db.memory.unshift(record);
    if (db.memory.length > 5000) db.memory = db.memory.slice(0, 5000);
    writeDb(record.userId, db);
  }

  async upsert(record: MemoryRecord): Promise<UpsertResult> {
    const db = readDb(record.userId);

    // Match por externalId+userId (chave preferida para sync externo, ex: obsidian)
    if (record.externalId) {
      const idx = db.memory.findIndex(
        (m) => m.externalId === record.externalId && m.userId === record.userId,
      );
      if (idx !== -1) {
        const merged: MemoryRecord = {
          ...db.memory[idx],
          ...record,
          // preserva createdAt original — o `record.createdAt` aqui vira "updatedAt" implícito
          createdAt: db.memory[idx].createdAt,
        };
        db.memory[idx] = merged;
        writeDb(record.userId, db);
        return { action: 'updated', record: merged };
      }
    } else {
      // Match por id direto se externalId não foi passado
      const idx = db.memory.findIndex((m) => m.id === record.id && m.userId === record.userId);
      if (idx !== -1) {
        const merged: MemoryRecord = { ...db.memory[idx], ...record, createdAt: db.memory[idx].createdAt };
        db.memory[idx] = merged;
        writeDb(record.userId, db);
        return { action: 'updated', record: merged };
      }
    }

    db.memory.unshift(record);
    if (db.memory.length > 5000) db.memory = db.memory.slice(0, 5000);
    writeDb(record.userId, db);
    return { action: 'created', record };
  }

  async list(opts: ListMemoryOptions = {}) {
    // O store local é por-usuário; sem userId não há arquivo a ler.
    if (!opts.userId) return [];
    const db = readDb(opts.userId);
    let items = db.memory;
    if (opts.userId) items = items.filter((m) => m.userId === opts.userId);
    if (opts.source) items = items.filter((m) => m.source === opts.source);
    if (opts.area) items = items.filter((m) => m.area === opts.area);
    if (opts.tags && opts.tags.length > 0) {
      const wanted = new Set(opts.tags);
      items = items.filter((m) => (m.tags ?? []).some((t) => wanted.has(t)));
    }
    return items.slice(0, opts.limit ?? 200);
  }

  async remove(userId: string, id: string): Promise<boolean> {
    const db = readDb(userId);
    const before = db.memory.length;
    db.memory = db.memory.filter((m) => !(m.id === id && m.userId === userId));
    const removed = db.memory.length !== before;
    if (removed) writeDb(userId, db);
    return removed;
  }
}

// ──────────────────────────────────────────────
// SUPABASE — persiste memórias (incl. Obsidian) por usuário na tabela
// memory_records. Requer a migration 003 (colunas source/external_id/tags/area).
// ──────────────────────────────────────────────

interface MemoryRow {
  id: string;
  user_id: string;
  type: MemoryRecord['type'];
  text: string;
  score: number | null;
  created_at: string;
  source: string | null;
  external_id: string | null;
  tags: string[] | null;
  area: string | null;
}

function rowToRecord(r: MemoryRow): MemoryRecord {
  return {
    id: r.id,
    userId: r.user_id,
    type: r.type,
    text: r.text,
    score: r.score ?? undefined,
    createdAt: r.created_at,
    source: (r.source as MemorySource | null) ?? undefined,
    externalId: r.external_id ?? undefined,
    tags: r.tags ?? undefined,
    area: r.area ?? undefined,
  };
}

function recordToRow(record: MemoryRecord): MemoryRow {
  return {
    id: record.id,
    user_id: record.userId,
    type: record.type,
    text: record.text,
    score: record.score ?? null,
    created_at: record.createdAt,
    source: record.source ?? null,
    external_id: record.externalId ?? null,
    tags: record.tags ?? [],
    area: record.area ?? null,
  };
}

class SupabaseMemoryConnector implements MemoryConnector {
  async add(record: MemoryRecord): Promise<void> {
    const { error } = await supabase!.from('memory_records').insert(recordToRow(record));
    if (error) throw new Error(`[memory] add: ${error.message}`);
  }

  async upsert(record: MemoryRecord): Promise<UpsertResult> {
    // Chave preferida para sync externo (Obsidian): (user_id, external_id).
    if (record.externalId) {
      const { data: existing } = await supabase!
        .from('memory_records')
        .select('id, created_at')
        .eq('user_id', record.userId)
        .eq('external_id', record.externalId)
        .maybeSingle();

      if (existing) {
        const merged = { ...recordToRow(record), id: existing.id, created_at: existing.created_at };
        const { data, error } = await supabase!
          .from('memory_records').update(merged).eq('id', existing.id).select().single();
        if (error) throw new Error(`[memory] upsert/update: ${error.message}`);
        return { action: 'updated', record: rowToRecord(data as MemoryRow) };
      }
    }

    const { data, error } = await supabase!
      .from('memory_records').insert(recordToRow(record)).select().single();
    if (error) throw new Error(`[memory] upsert/insert: ${error.message}`);
    return { action: 'created', record: rowToRecord(data as MemoryRow) };
  }

  async list(opts: ListMemoryOptions = {}): Promise<MemoryRecord[]> {
    if (!opts.userId) return [];
    let q = supabase!.from('memory_records').select('*').eq('user_id', opts.userId);
    if (opts.source) q = q.eq('source', opts.source);
    if (opts.area) q = q.eq('area', opts.area);
    q = q.order('created_at', { ascending: false }).limit(opts.limit ?? 200);
    const { data, error } = await q;
    if (error) throw new Error(`[memory] list: ${error.message}`);
    let items = (data as MemoryRow[] | null ?? []).map(rowToRecord);
    // Filtro de tags (match em qualquer uma) — feito em memória.
    if (opts.tags && opts.tags.length > 0) {
      const wanted = new Set(opts.tags);
      items = items.filter((m) => (m.tags ?? []).some((t) => wanted.has(t)));
    }
    return items;
  }

  async remove(userId: string, id: string): Promise<boolean> {
    const { data, error } = await supabase!
      .from('memory_records').delete().eq('id', id).eq('user_id', userId).select('id');
    if (error) throw new Error(`[memory] remove: ${error.message}`);
    return (data?.length ?? 0) > 0;
  }
}

class NoopMemoryConnector implements MemoryConnector {
  async add() {}
  async upsert(record: MemoryRecord): Promise<UpsertResult> {
    return { action: 'created', record };
  }
  async list() { return []; }
  async remove() { return false; }
}

export function getMemoryConnector(): MemoryConnector {
  // Override explícito tem prioridade.
  const provider = process.env.YOULI_MEMORY_CONNECTOR;
  if (provider === 'noop') return new NoopMemoryConnector();
  if (provider === 'local') return new LocalMemoryConnector();
  if (provider === 'supabase' && hasSupabase() && supabase) return new SupabaseMemoryConnector();
  // Default: Supabase quando habilitado (YOULI_USE_SUPABASE), senão local.
  if (hasSupabase() && supabase) return new SupabaseMemoryConnector();
  return new LocalMemoryConnector();
}
