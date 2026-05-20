import { readDb, writeDb } from '../../repositories/local-db';
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

class NoopMemoryConnector implements MemoryConnector {
  async add() {}
  async upsert(record: MemoryRecord): Promise<UpsertResult> {
    return { action: 'created', record };
  }
  async list() { return []; }
  async remove() { return false; }
}

export function getMemoryConnector(): MemoryConnector {
  const provider = process.env.YOULI_MEMORY_CONNECTOR || 'local';
  if (provider === 'local') return new LocalMemoryConnector();
  return new NoopMemoryConnector();
}
