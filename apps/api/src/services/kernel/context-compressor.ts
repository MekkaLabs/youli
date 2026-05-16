/**
 * Context Compressor — Aider-inspired "Smart Context Compression"
 * Reduz o contexto do usuário para caber dentro do orçamento de tokens,
 * priorizando dados recentes e de alta relevância para a área ativa.
 */

export interface CompressionOptions {
  budgetTokens: number;
  area: string;
  preserveRecent: number;
}

export interface CompressionResult {
  compressed: Record<string, unknown>;
  originalTokenEstimate: number;
  compressedTokenEstimate: number;
  compressionRatio: number;
  droppedKeys: string[];
}

export function estimateTokens(obj: unknown): number {
  return Math.ceil(JSON.stringify(obj).length / 4);
}

export function scoreRelevance(key: string, value: unknown, area: string): number {
  let score = 0;

  if (key.toLowerCase().includes(area.toLowerCase())) {
    score += 0.5;
  }

  const isEmpty =
    value === null ||
    value === undefined ||
    value === '' ||
    (Array.isArray(value) && value.length === 0);

  if (!isEmpty) {
    score += 0.3;
  }

  if (key.includes('recent') || key.includes('current') || key.includes('today')) {
    score += 0.2;
  }

  return score;
}

export function compressContext(
  context: Record<string, unknown>,
  options: CompressionOptions,
): CompressionResult {
  const { budgetTokens, area } = options;
  const originalTokenEstimate = estimateTokens(context);

  const entries = Object.entries(context);

  const scored = entries.map(([key, value]) => ({
    key,
    value,
    score: scoreRelevance(key, value, area),
  }));

  scored.sort((a, b) => b.score - a.score);

  const compressed: Record<string, unknown> = {};
  const droppedKeys: string[] = [];
  let currentTokens = 0;

  for (const { key, value } of scored) {
    const entryTokens = estimateTokens({ [key]: value });
    if (currentTokens + entryTokens <= budgetTokens) {
      compressed[key] = value;
      currentTokens += entryTokens;
    } else {
      droppedKeys.push(key);
    }
  }

  const compressedTokenEstimate = estimateTokens(compressed);
  const compressionRatio =
    originalTokenEstimate > 0 ? compressedTokenEstimate / originalTokenEstimate : 1;

  return {
    compressed,
    originalTokenEstimate,
    compressedTokenEstimate,
    compressionRatio,
    droppedKeys,
  };
}

export function shouldCompress(
  context: Record<string, unknown>,
  budgetTokens: number,
): boolean {
  return estimateTokens(context) > budgetTokens * 0.8;
}
