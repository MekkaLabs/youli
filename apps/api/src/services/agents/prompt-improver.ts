/**
 * Prompt Improver — Aider-inspired "Self-Improving Prompts"
 * Registra quais system prompts levam a maiores self-eval scores.
 */

import fs from 'node:fs';
import path from 'node:path';

export interface PromptVariant {
  id: string;
  area: string;
  agentName: string;
  systemPromptHash: string;
  avgSelfEvalScore: number;
  sampleCount: number;
  lastUsed: string;
  approved: boolean;
}

export interface PromptPerformanceStore {
  variants: PromptVariant[];
  updatedAt: string;
}

const DATA_PATH = path.join(process.cwd(), 'src/repositories/.data/prompt-performance.json');

export function hashPrompt(prompt: string): string {
  return prompt.replace(/\s+/g, ' ').trim().slice(0, 32);
}

export function loadStore(): PromptPerformanceStore {
  try {
    if (fs.existsSync(DATA_PATH)) {
      const raw = fs.readFileSync(DATA_PATH, 'utf-8');
      return JSON.parse(raw) as PromptPerformanceStore;
    }
  } catch {
    // fall through to default
  }
  return { variants: [], updatedAt: new Date().toISOString() };
}

export function saveStore(store: PromptPerformanceStore): void {
  const dir = path.dirname(DATA_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(DATA_PATH, JSON.stringify(store, null, 2), 'utf-8');
}

export function recordPromptPerformance(
  area: string,
  agentName: string,
  systemPrompt: string,
  selfEvalScore: number,
): void {
  const store = loadStore();
  const hash = hashPrompt(systemPrompt);

  const existing = store.variants.find(
    (v) => v.area === area && v.agentName === agentName && v.systemPromptHash === hash,
  );

  if (existing) {
    existing.avgSelfEvalScore =
      (existing.avgSelfEvalScore * existing.sampleCount + selfEvalScore) /
      (existing.sampleCount + 1);
    existing.sampleCount += 1;
    existing.lastUsed = new Date().toISOString();
    existing.approved =
      existing.sampleCount >= 5 && existing.avgSelfEvalScore >= 80;
  } else {
    const variant: PromptVariant = {
      id: `pv_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      area,
      agentName,
      systemPromptHash: hash,
      avgSelfEvalScore: selfEvalScore,
      sampleCount: 1,
      lastUsed: new Date().toISOString(),
      approved: false,
    };
    store.variants.push(variant);
  }

  store.updatedAt = new Date().toISOString();
  saveStore(store);
}

export function getBestPromptVariant(
  area: string,
  agentName: string,
): PromptVariant | null {
  const store = loadStore();
  const candidates = store.variants
    .filter((v) => v.area === area && v.agentName === agentName && v.approved)
    .sort((a, b) => b.avgSelfEvalScore - a.avgSelfEvalScore);

  return candidates[0] ?? null;
}
