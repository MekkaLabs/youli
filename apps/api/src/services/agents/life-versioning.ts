/**
 * Life Versioning — Aider-inspired "Git-like Versioning + Undo"
 * Cria snapshots versionados do contexto. Permite reverter estados.
 */

import fs from 'node:fs';
import path from 'node:path';

export interface LifeVersion {
  id: string;
  userId: string;
  area: string;
  snapshot: Record<string, unknown>;
  message: string;
  createdAt: string;
  tags: string[];
}

export interface VersionHistory {
  userId: string;
  versions: LifeVersion[];
  currentVersionId: string | null;
}

function getVersionsPath(userId: string): string {
  return path.join(process.cwd(), 'src', 'repositories', '.data', `versions-${userId}.json`);
}

function ensureDataDir(filePath: string): void {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

export function createVersion(
  userId: string,
  area: string,
  snapshot: Record<string, unknown>,
  message: string,
  tags: string[] = [],
): LifeVersion {
  const id = `v_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  return {
    id,
    userId,
    area,
    snapshot,
    message,
    createdAt: new Date().toISOString(),
    tags,
  };
}

export function saveVersion(version: LifeVersion, maxHistory: number = 100): void {
  const history = loadVersionHistory(version.userId);
  history.versions.unshift(version);

  // Trim to maxHistory
  if (history.versions.length > maxHistory) {
    history.versions = history.versions.slice(0, maxHistory);
  }

  history.currentVersionId = version.id;

  const filePath = getVersionsPath(version.userId);
  ensureDataDir(filePath);
  fs.writeFileSync(filePath, JSON.stringify(history, null, 2), 'utf-8');
}

export function loadVersionHistory(userId: string): VersionHistory {
  const filePath = getVersionsPath(userId);
  if (!fs.existsSync(filePath)) {
    return { userId, versions: [], currentVersionId: null };
  }
  try {
    const raw = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(raw) as VersionHistory;
  } catch {
    return { userId, versions: [], currentVersionId: null };
  }
}

export function getVersion(userId: string, versionId: string): LifeVersion | null {
  const history = loadVersionHistory(userId);
  return history.versions.find((v) => v.id === versionId) ?? null;
}

export function undoToVersion(userId: string, versionId: string): LifeVersion | null {
  const version = getVersion(userId, versionId);
  if (!version) return null;

  const history = loadVersionHistory(userId);
  history.currentVersionId = versionId;

  const filePath = getVersionsPath(userId);
  ensureDataDir(filePath);
  fs.writeFileSync(filePath, JSON.stringify(history, null, 2), 'utf-8');

  return version;
}

export function listVersions(userId: string, area?: string): LifeVersion[] {
  const history = loadVersionHistory(userId);
  const filtered = area
    ? history.versions.filter((v) => v.area === area)
    : history.versions;

  return filtered.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
}

export function autoSnapshot(
  userId: string,
  area: string,
  snapshot: Record<string, unknown>,
): LifeVersion {
  const version = createVersion(userId, area, snapshot, 'Auto-snapshot', ['auto']);
  saveVersion(version);
  return version;
}
