/**
 * Life Context Map — Aider-inspired "Repo Map"
 * Gera um mapa token-budget-aware do contexto de vida do usuário.
 */

export interface ContextMapSection {
  area: string;
  summary: string;
  keyMetrics: string[];
  alertLevel: 'ok' | 'attention' | 'critical';
}

export interface LifeContextMap {
  userId: string;
  generatedAt: string;
  sections: ContextMapSection[];
  totalTokenEstimate: number;
  formattedMap: string;
}

const KNOWN_AREAS = [
  'dashboard',
  'financeiro',
  'tarefas',
  'habitos',
  'metas',
  'fitness',
  'calendario',
  'insights',
  'foco',
  'perfil',
];

function alertLevelPrefix(level: 'ok' | 'attention' | 'critical'): string {
  switch (level) {
    case 'ok':
      return '[OK]';
    case 'critical':
      return '[!!]';
    case 'attention':
      return '[~~]';
  }
}

function estimateTokens(text: string): number {
  // Rough estimate: 1 token ≈ 4 characters
  return Math.ceil(text.length / 4);
}

export function extractAreaSummary(area: string, data: unknown): ContextMapSection {
  const isEmpty =
    data === null ||
    data === undefined ||
    (typeof data === 'object' && !Array.isArray(data) && Object.keys(data as object).length === 0) ||
    (typeof data === 'string' && (data as string).trim().length === 0);

  if (isEmpty) {
    return {
      area,
      summary: `${area}: sem dados`,
      keyMetrics: [],
      alertLevel: 'critical',
    };
  }

  if (typeof data === 'object' && data !== null && !Array.isArray(data)) {
    const obj = data as Record<string, unknown>;
    const keyMetrics = Object.entries(obj)
      .filter(([, v]) => v !== null && v !== undefined)
      .slice(0, 3)
      .map(([k, v]) => {
        const strVal = typeof v === 'object' ? k : `${k} ${v}`;
        return strVal.trim();
      });

    const alertLevel: 'ok' | 'attention' | 'critical' =
      keyMetrics.length < 2 ? 'attention' : 'ok';

    const summary = `${area}: ${keyMetrics.join(', ')}`;

    return { area, summary, keyMetrics, alertLevel };
  }

  // Fallback for primitive / array types
  const strVal = Array.isArray(data)
    ? (data as unknown[]).slice(0, 3).map(String)
    : [String(data)];

  const keyMetrics = strVal;
  const alertLevel: 'ok' | 'attention' | 'critical' =
    keyMetrics.length < 2 ? 'attention' : 'ok';

  return {
    area,
    summary: `${area}: ${keyMetrics.join(', ')}`,
    keyMetrics,
    alertLevel,
  };
}

export function buildContextMap(
  context: Record<string, unknown>,
  options: { maxTokens: number; userId: string },
): LifeContextMap {
  const sections: ContextMapSection[] = [];

  for (const area of KNOWN_AREAS) {
    if (Object.prototype.hasOwnProperty.call(context, area)) {
      sections.push(extractAreaSummary(area, context[area]));
    }
  }

  const lines = ['=== LIFE CONTEXT MAP ==='];
  for (const section of sections) {
    lines.push(`${alertLevelPrefix(section.alertLevel)} ${section.summary}`);
  }
  lines.push('=== END MAP ===');

  let formattedMap = lines.join('\n');
  const totalTokenEstimate = estimateTokens(formattedMap);

  if (totalTokenEstimate > options.maxTokens) {
    const maxChars = options.maxTokens * 4;
    const truncationNote = '\n[TRUNCATED]';
    formattedMap =
      formattedMap.slice(0, maxChars - truncationNote.length) + truncationNote;
  }

  return {
    userId: options.userId,
    generatedAt: new Date().toISOString(),
    sections,
    totalTokenEstimate,
    formattedMap,
  };
}

export function getContextMapString(
  context: Record<string, unknown>,
  maxTokens: number,
  userId: string,
): string {
  return buildContextMap(context, { maxTokens, userId }).formattedMap;
}
