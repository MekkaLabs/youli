import { readDb, writeDb } from '../../repositories/local-db';
import type { MemoryRecord } from '@youli/shared';

export interface MemoryConnector {
  add(record: MemoryRecord): Promise<void>;
  list(limit?: number): Promise<MemoryRecord[]>;
}

class LocalMemoryConnector implements MemoryConnector {
  async add(record: MemoryRecord) {
    const db = readDb();
    db.memory.unshift(record);
    if (db.memory.length > 1000) db.memory = db.memory.slice(0, 1000);
    writeDb(db);
  }
  async list(limit = 200) {
    const db = readDb();
    return db.memory.slice(0, limit);
  }
}

class NoopMemoryConnector implements MemoryConnector {
  async add() {}
  async list() { return []; }
}

export function getMemoryConnector(): MemoryConnector {
  const provider = process.env.YOULI_MEMORY_CONNECTOR || 'local';
  if (provider === 'local') return new LocalMemoryConnector();
  return new NoopMemoryConnector();
}

