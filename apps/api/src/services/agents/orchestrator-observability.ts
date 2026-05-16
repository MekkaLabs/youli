import fs from 'node:fs';
import path from 'node:path';
import type { LifeArea } from './agent-definitions';

type TraceStatus = 'ok' | 'interrupted' | 'error';

export interface OrchestratorTrace {
  traceId: string;
  threadId: string;
  area: LifeArea;
  startedAt: string;
  endedAt: string;
  durationMs: number;
  status: TraceStatus;
  nodes: string[];
  handoffs: Array<{ from: LifeArea; to: LifeArea; reason: string }>;
  quality?: {
    actionableScore: number;
    consistencyScore: number;
    contextRetentionScore: number;
  };
  selfEvalScore?: number;
  interruptedReason?: string;
}

interface TraceStore {
  traces: OrchestratorTrace[];
}

const TRACE_PATH = path.join(process.cwd(), 'src', 'repositories', '.data', 'orchestrator-traces.json');

function ensureStoreDir() {
  const dir = path.dirname(TRACE_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function readStore(): TraceStore {
  ensureStoreDir();
  if (!fs.existsSync(TRACE_PATH)) {
    const initial: TraceStore = { traces: [] };
    fs.writeFileSync(TRACE_PATH, JSON.stringify(initial, null, 2));
    return initial;
  }
  try {
    return JSON.parse(fs.readFileSync(TRACE_PATH, 'utf8')) as TraceStore;
  } catch {
    return { traces: [] };
  }
}

function writeStore(store: TraceStore) {
  ensureStoreDir();
  fs.writeFileSync(TRACE_PATH, JSON.stringify(store, null, 2));
}

export function saveTrace(trace: OrchestratorTrace) {
  const store = readStore();
  store.traces.push(trace);
  if (store.traces.length > 400) {
    store.traces = store.traces.slice(store.traces.length - 400);
  }
  writeStore(store);
}

export function listTraces(limit = 30): OrchestratorTrace[] {
  const store = readStore();
  return store.traces.slice(-Math.max(1, limit)).reverse();
}

export function getTraceMetrics() {
  const traces = listTraces(200);
  const total = traces.length;
  const ok = traces.filter((t) => t.status === 'ok').length;
  const interrupted = traces.filter((t) => t.status === 'interrupted').length;
  const errors = traces.filter((t) => t.status === 'error').length;
  const avgDurationMs = total
    ? Math.round(traces.reduce((sum, t) => sum + t.durationMs, 0) / total)
    : 0;
  const avgActionable = total
    ? Number((traces.reduce((sum, t) => sum + (t.quality?.actionableScore ?? 0), 0) / total).toFixed(3))
    : 0;
  const avgConsistency = total
    ? Number((traces.reduce((sum, t) => sum + (t.quality?.consistencyScore ?? 0), 0) / total).toFixed(3))
    : 0;
  const avgContextRetention = total
    ? Number((traces.reduce((sum, t) => sum + (t.quality?.contextRetentionScore ?? 0), 0) / total).toFixed(3))
    : 0;
  const byArea: Record<string, number> = {};
  for (const t of traces) byArea[t.area] = (byArea[t.area] ?? 0) + 1;
  return {
    total,
    ok,
    interrupted,
    errors,
    avgDurationMs,
    avgActionable,
    avgConsistency,
    avgContextRetention,
    byArea
  };
}
