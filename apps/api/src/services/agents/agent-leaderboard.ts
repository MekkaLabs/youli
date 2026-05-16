/**
 * Agent Leaderboard — Aider-inspired "Agent Leaderboard"
 * Registra métricas de performance por agente após cada interação.
 */

import fs from 'node:fs';
import path from 'node:path';

export interface AgentMetricEntry {
  agentName: string;
  area: string;
  selfEvalScore: number;
  durationMs: number;
  timestamp: string;
  userMessageLength: number;
  responseLength: number;
}

export interface AgentStats {
  agentName: string;
  area: string;
  totalInteractions: number;
  avgSelfEvalScore: number;
  avgDurationMs: number;
  p95DurationMs: number;
  lastInteraction: string;
}

const DATA_FILE = path.join(process.cwd(), 'src/repositories/.data/agent-leaderboard.json');
const MAX_ENTRIES = 500;

function readData(): { entries: AgentMetricEntry[] } {
  try {
    const raw = fs.readFileSync(DATA_FILE, 'utf-8');
    return JSON.parse(raw) as { entries: AgentMetricEntry[] };
  } catch {
    return { entries: [] };
  }
}

function writeData(data: { entries: AgentMetricEntry[] }): void {
  const dir = path.dirname(DATA_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8');
}

export function recordInteraction(entry: AgentMetricEntry): void {
  const data = readData();
  data.entries.push(entry);

  if (data.entries.length > MAX_ENTRIES) {
    data.entries = data.entries.slice(data.entries.length - MAX_ENTRIES);
  }

  writeData(data);
}

export function getLeaderboard(): AgentStats[] {
  const { entries } = readData();

  const groups = new Map<string, AgentMetricEntry[]>();

  for (const entry of entries) {
    const key = `${entry.agentName}::${entry.area}`;
    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key)!.push(entry);
  }

  const stats: AgentStats[] = [];

  for (const [, groupEntries] of groups) {
    const first = groupEntries[0];
    const totalInteractions = groupEntries.length;

    const avgSelfEvalScore =
      groupEntries.reduce((sum, e) => sum + e.selfEvalScore, 0) / totalInteractions;

    const avgDurationMs =
      groupEntries.reduce((sum, e) => sum + e.durationMs, 0) / totalInteractions;

    const sortedDurations = [...groupEntries.map((e) => e.durationMs)].sort((a, b) => a - b);
    const p95Index = Math.floor(sortedDurations.length * 0.95);
    const p95DurationMs = sortedDurations[Math.min(p95Index, sortedDurations.length - 1)];

    const lastInteraction = groupEntries.reduce((latest, e) =>
      e.timestamp > latest.timestamp ? e : latest,
    ).timestamp;

    stats.push({
      agentName: first.agentName,
      area: first.area,
      totalInteractions,
      avgSelfEvalScore,
      avgDurationMs,
      p95DurationMs,
      lastInteraction,
    });
  }

  stats.sort((a, b) => b.avgSelfEvalScore - a.avgSelfEvalScore);

  return stats;
}

export function getAreaLeaderboard(area: string): AgentStats[] {
  return getLeaderboard().filter((s) => s.area === area);
}

export function getTopAgent(area: string): AgentStats | null {
  const leaderboard = getAreaLeaderboard(area);
  return leaderboard.length > 0 ? leaderboard[0] : null;
}
