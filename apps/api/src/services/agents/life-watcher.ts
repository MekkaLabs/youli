/**
 * Life Watcher — Aider-inspired "Watch Mode"
 * Monitora mudanças nos dados do usuário via polling e dispara análises passivas.
 */

import fs from 'node:fs';
import path from 'node:path';

export interface WatchEvent {
  area: string;
  userId: string;
  changedKeys: string[];
  timestamp: string;
  previousSnapshot: Record<string, unknown>;
  currentSnapshot: Record<string, unknown>;
}

export interface WatcherConfig {
  userId: string;
  areas: string[];
  pollingIntervalMs: number;
  onEvent: (event: WatchEvent) => Promise<void>;
}

export interface WatcherHandle {
  stop: () => void;
  isRunning: () => boolean;
}

interface SnapshotFile {
  areas: Record<string, unknown>;
  updatedAt: string;
}

const activeWatchers: Map<string, { handle: WatcherHandle; timer: NodeJS.Timeout }> = new Map();

function getSnapshotPath(userId: string): string {
  return path.join(process.cwd(), 'src', 'repositories', '.data', `snapshots-${userId}.json`);
}

function ensureDataDir(filePath: string): void {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function readSnapshot(userId: string): SnapshotFile {
  const filePath = getSnapshotPath(userId);
  if (!fs.existsSync(filePath)) {
    return { areas: {}, updatedAt: new Date().toISOString() };
  }
  try {
    const raw = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(raw) as SnapshotFile;
  } catch {
    return { areas: {}, updatedAt: new Date().toISOString() };
  }
}

function writeSnapshot(userId: string, snapshot: SnapshotFile): void {
  const filePath = getSnapshotPath(userId);
  ensureDataDir(filePath);
  fs.writeFileSync(filePath, JSON.stringify(snapshot, null, 2), 'utf-8');
}

export function diffSnapshots(
  prev: Record<string, unknown>,
  curr: Record<string, unknown>,
): string[] {
  const allKeys = new Set([...Object.keys(prev), ...Object.keys(curr)]);
  const changedKeys: string[] = [];
  for (const key of allKeys) {
    if (JSON.stringify(prev[key]) !== JSON.stringify(curr[key])) {
      changedKeys.push(key);
    }
  }
  return changedKeys;
}

export function startWatcher(config: WatcherConfig): WatcherHandle {
  const { userId, areas, pollingIntervalMs, onEvent } = config;
  const watcherKey = `${userId}:${areas.join(',')}`;

  // Stop existing watcher for the same key if any
  if (activeWatchers.has(watcherKey)) {
    const existing = activeWatchers.get(watcherKey)!;
    clearInterval(existing.timer);
    activeWatchers.delete(watcherKey);
  }

  let running = true;

  const handle: WatcherHandle = {
    stop: () => {
      running = false;
      const entry = activeWatchers.get(watcherKey);
      if (entry) {
        clearInterval(entry.timer);
        activeWatchers.delete(watcherKey);
      }
    },
    isRunning: () => running,
  };

  const timer = setInterval(async () => {
    if (!running) return;

    const snapshotFile = readSnapshot(userId);
    const previousAreas = snapshotFile.areas as Record<string, Record<string, unknown>>;

    let hasChanges = false;
    const updatedAreas: Record<string, unknown> = { ...previousAreas };

    for (const area of areas) {
      const prevAreaSnapshot = (previousAreas[area] ?? {}) as Record<string, unknown>;

      // Re-read from file to get potentially updated current state
      const currentFile = readSnapshot(userId);
      const currentAreaSnapshot = (
        (currentFile.areas as Record<string, Record<string, unknown>>)[area] ?? {}
      ) as Record<string, unknown>;

      const changedKeys = diffSnapshots(prevAreaSnapshot, currentAreaSnapshot);

      if (changedKeys.length > 0) {
        hasChanges = true;
        updatedAreas[area] = currentAreaSnapshot;

        const event: WatchEvent = {
          area,
          userId,
          changedKeys,
          timestamp: new Date().toISOString(),
          previousSnapshot: prevAreaSnapshot,
          currentSnapshot: currentAreaSnapshot,
        };

        try {
          await onEvent(event);
        } catch (err) {
          console.error(`[life-watcher] onEvent error for area=${area}:`, err);
        }
      }
    }

    if (hasChanges) {
      writeSnapshot(userId, {
        areas: updatedAreas,
        updatedAt: new Date().toISOString(),
      });
    }
  }, pollingIntervalMs);

  activeWatchers.set(watcherKey, { handle, timer });

  return handle;
}

export function stopAllWatchers(): void {
  for (const [, entry] of activeWatchers) {
    clearInterval(entry.timer);
  }
  activeWatchers.clear();
}

export function getActiveWatcherCount(): number {
  return activeWatchers.size;
}
