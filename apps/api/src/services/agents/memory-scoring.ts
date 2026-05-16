import type { MemoryRecord } from '@youli/shared';
import type { UserContext } from './agent-executor';

function daysSince(iso: string): number {
  const diff = Date.now() - new Date(iso).getTime();
  return Math.max(0, diff / 86400000);
}

function recencyScore(iso: string): number {
  const d = daysSince(iso);
  if (d <= 1) return 1;
  if (d <= 3) return 0.8;
  if (d <= 7) return 0.6;
  if (d <= 14) return 0.4;
  return 0.2;
}

function importanceScore(record: MemoryRecord): number {
  return Math.max(0.1, Math.min(1, record.score ?? 0.5));
}

function semanticScore(query: string, text: string): number {
  const q = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (!q.length) return 0.3;
  const t = text.toLowerCase();
  const hits = q.filter((w) => t.includes(w)).length;
  return Math.min(1, hits / q.length);
}

export interface RankedMemory {
  record: MemoryRecord;
  score: number;
}

export function rankMemories(query: string, memories: MemoryRecord[], limit = 5): RankedMemory[] {
  return memories
    .map((record) => {
      const s = semanticScore(query, record.text) * 0.5
        + recencyScore(record.createdAt) * 0.3
        + importanceScore(record) * 0.2;
      return { record, score: Number(s.toFixed(4)) };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

export function buildMemoryContext(query: string, context: UserContext): string[] {
  const memories = (context.memoryRecords ?? []) as MemoryRecord[];
  return rankMemories(query, memories, 4).map((m) => m.record.text);
}

