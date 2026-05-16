import fs from 'node:fs';
import path from 'node:path';

interface FunctionTrace {
  id: string;
  functionId: string;
  threadId: string;
  area: string;
  startedAt: string;
  endedAt: string;
  latencyMs: number;
  success: boolean;
  error?: string;
}

interface Store { traces: FunctionTrace[] }

const TRACE_PATH = path.join(process.cwd(), 'src', 'repositories', '.data', 'kernel-function-traces.json');

function readStore(): Store {
  if (!fs.existsSync(TRACE_PATH)) return { traces: [] };
  try {
    return JSON.parse(fs.readFileSync(TRACE_PATH, 'utf8')) as Store;
  } catch {
    return { traces: [] };
  }
}

function writeStore(store: Store) {
  const dir = path.dirname(TRACE_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(TRACE_PATH, JSON.stringify(store, null, 2));
}

export function saveFunctionTrace(trace: Omit<FunctionTrace, 'id'>) {
  const store = readStore();
  store.traces.push({
    id: `ktrace_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    ...trace,
  });
  if (store.traces.length > 600) store.traces = store.traces.slice(-600);
  writeStore(store);
}

export function getFunctionMetrics(limit = 300) {
  const traces = readStore().traces.slice(-limit);
  const total = traces.length;
  const success = traces.filter((t) => t.success).length;
  const failed = total - success;
  const avgLatencyMs = total ? Math.round(traces.reduce((a, b) => a + b.latencyMs, 0) / total) : 0;
  const byFunction: Record<string, { total: number; success: number; failed: number }> = {};
  for (const t of traces) {
    byFunction[t.functionId] ??= { total: 0, success: 0, failed: 0 };
    byFunction[t.functionId].total += 1;
    if (t.success) byFunction[t.functionId].success += 1;
    else byFunction[t.functionId].failed += 1;
  }
  return { total, success, failed, avgLatencyMs, byFunction };
}

