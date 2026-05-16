import fs from 'node:fs';
import path from 'node:path';
import type { UserContext } from './agent-executor';

export interface ContextSnapshot {
  id: string;
  threadId: string;
  label: string;
  context: UserContext;
  createdAt: string;
}

interface Store { snapshots: ContextSnapshot[] }

const PATH_FILE = path.join(process.cwd(), 'src', 'repositories', '.data', 'context-snapshots.json');

function readStore(): Store {
  if (!fs.existsSync(PATH_FILE)) return { snapshots: [] };
  try {
    return JSON.parse(fs.readFileSync(PATH_FILE, 'utf8')) as Store;
  } catch {
    return { snapshots: [] };
  }
}

function writeStore(store: Store) {
  const dir = path.dirname(PATH_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(PATH_FILE, JSON.stringify(store, null, 2));
}

export function saveContextSnapshot(threadId: string, label: string, context: UserContext) {
  const store = readStore();
  store.snapshots.push({
    id: `snap_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    threadId,
    label,
    context,
    createdAt: new Date().toISOString(),
  });
  if (store.snapshots.length > 1000) store.snapshots = store.snapshots.slice(-1000);
  writeStore(store);
}

export function getSnapshots(threadId: string) {
  return readStore().snapshots.filter((x) => x.threadId === threadId);
}

