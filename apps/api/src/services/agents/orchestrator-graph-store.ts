import fs from 'node:fs';
import path from 'node:path';
import type { LifeArea } from './agent-definitions';
import type { UserContext } from './agent-executor';

export interface OrchestratorGraphCheckpoint {
  threadId: string;
  nodeId: string;
  status: 'running' | 'interrupted' | 'completed' | 'error';
  message: string;
  area: LifeArea;
  context: UserContext;
  createdAt: string;
  updatedAt: string;
  interruptReason?: string;
  events: string[];
}

interface OrchestratorGraphStore {
  checkpoints: Record<string, OrchestratorGraphCheckpoint>;
}

const storePath = path.join(process.cwd(), 'src', 'repositories', '.data', 'orchestrator-graph.json');

function defaultStore(): OrchestratorGraphStore {
  return { checkpoints: {} };
}

function ensureStoreDir() {
  const dir = path.dirname(storePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function readStore(): OrchestratorGraphStore {
  ensureStoreDir();
  if (!fs.existsSync(storePath)) {
    const initial = defaultStore();
    fs.writeFileSync(storePath, JSON.stringify(initial, null, 2));
    return initial;
  }
  try {
    return JSON.parse(fs.readFileSync(storePath, 'utf8')) as OrchestratorGraphStore;
  } catch {
    const initial = defaultStore();
    fs.writeFileSync(storePath, JSON.stringify(initial, null, 2));
    return initial;
  }
}

function writeStore(store: OrchestratorGraphStore) {
  ensureStoreDir();
  fs.writeFileSync(storePath, JSON.stringify(store, null, 2));
}

export function getGraphCheckpoint(threadId: string): OrchestratorGraphCheckpoint | null {
  const store = readStore();
  return store.checkpoints[threadId] || null;
}

export function putGraphCheckpoint(checkpoint: OrchestratorGraphCheckpoint) {
  const store = readStore();
  store.checkpoints[checkpoint.threadId] = checkpoint;
  writeStore(store);
}

