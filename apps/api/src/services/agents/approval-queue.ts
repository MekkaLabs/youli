import fs from 'node:fs';
import path from 'node:path';
import type { LifeArea } from './agent-definitions';

export interface ApprovalItem {
  id: string;
  threadId: string;
  area: LifeArea;
  reason: string;
  status: 'pending' | 'processing' | 'approved' | 'rejected';
  createdAt: string;
  updatedAt: string;
}

interface Store { items: ApprovalItem[] }
const FILE_PATH = path.join(process.cwd(), 'src', 'repositories', '.data', 'approval-queue.json');

function readStore(): Store {
  if (!fs.existsSync(FILE_PATH)) return { items: [] };
  try {
    return JSON.parse(fs.readFileSync(FILE_PATH, 'utf8')) as Store;
  } catch {
    return { items: [] };
  }
}

function writeStore(store: Store) {
  const dir = path.dirname(FILE_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(FILE_PATH, JSON.stringify(store, null, 2));
}

export function createApproval(threadId: string, area: LifeArea, reason: string): ApprovalItem {
  const store = readStore();
  const item: ApprovalItem = {
    id: `appr_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    threadId, area, reason,
    status: 'pending',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  store.items.push(item);
  writeStore(store);
  return item;
}

export function listApprovals(status?: ApprovalItem['status']) {
  const items = readStore().items;
  return status ? items.filter((i) => i.status === status) : items;
}

export function updateApproval(id: string, status: 'approved' | 'rejected') {
  const store = readStore();
  const idx = store.items.findIndex((i) => i.id === id);
  if (idx < 0) return null;
  store.items[idx] = { ...store.items[idx], status, updatedAt: new Date().toISOString() };
  writeStore(store);
  return store.items[idx];
}

export function updateLatestApprovalByThread(threadId: string, status: 'approved' | 'rejected') {
  const store = readStore();
  const candidates = store.items
    .map((item, index) => ({ item, index }))
    .filter((x) => x.item.threadId === threadId && x.item.status === 'pending');
  if (!candidates.length) return null;
  const last = candidates[candidates.length - 1];
  store.items[last.index] = { ...store.items[last.index], status, updatedAt: new Date().toISOString() };
  writeStore(store);
  return store.items[last.index];
}

export function claimLatestPendingApproval(threadId: string) {
  const store = readStore();
  const candidates = store.items
    .map((item, index) => ({ item, index }))
    .filter((x) => x.item.threadId === threadId && x.item.status === 'pending');
  if (!candidates.length) return null;
  const last = candidates[candidates.length - 1];
  const claimed = { ...store.items[last.index], status: 'processing' as const, updatedAt: new Date().toISOString() };
  store.items[last.index] = claimed;
  writeStore(store);
  return claimed;
}

export function finalizeApproval(id: string, status: 'approved' | 'rejected' | 'pending') {
  const store = readStore();
  const idx = store.items.findIndex((i) => i.id === id);
  if (idx < 0) return null;
  store.items[idx] = { ...store.items[idx], status, updatedAt: new Date().toISOString() };
  writeStore(store);
  return store.items[idx];
}
