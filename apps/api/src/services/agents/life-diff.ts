/**
 * Life Diff — Aider-inspired "Unified Diff"
 * Gera diffs human-friendly entre snapshots do contexto do usuário.
 */

export interface DiffLine {
  type: 'added' | 'removed' | 'unchanged';
  key: string;
  oldValue?: unknown;
  newValue?: unknown;
  label: string;
}

export interface LifeDiffResult {
  area: string;
  timestamp: string;
  lines: DiffLine[];
  summary: string;
  hasChanges: boolean;
}

export function generateDiff(
  area: string,
  before: Record<string, unknown>,
  after: Record<string, unknown>
): LifeDiffResult {
  const allKeys = Array.from(
    new Set([...Object.keys(before), ...Object.keys(after)])
  );

  let added = 0;
  let removed = 0;
  let changed = 0;

  const lines: DiffLine[] = allKeys.map((key) => {
    const inBefore = Object.prototype.hasOwnProperty.call(before, key);
    const inAfter = Object.prototype.hasOwnProperty.call(after, key);

    if (!inBefore && inAfter) {
      added++;
      return {
        type: 'added',
        key,
        newValue: after[key],
        label: `${area}.${key}`,
      };
    }

    if (inBefore && !inAfter) {
      removed++;
      return {
        type: 'removed',
        key,
        oldValue: before[key],
        label: `${area}.${key}`,
      };
    }

    // Both present
    const beforeJson = JSON.stringify(before[key]);
    const afterJson = JSON.stringify(after[key]);

    if (beforeJson !== afterJson) {
      changed++;
    }

    return {
      type: 'unchanged',
      key,
      oldValue: before[key],
      newValue: after[key],
      label: `${area}.${key}`,
    };
  });

  const summary = `${added} adicionadas, ${removed} removidas, ${changed} alteradas`;
  const hasChanges = added > 0 || removed > 0 || changed > 0;

  return {
    area,
    timestamp: new Date().toISOString(),
    lines,
    summary,
    hasChanges,
  };
}

export function formatDiffForPrompt(diff: LifeDiffResult): string {
  return diff.lines
    .map((line) => {
      if (line.type === 'added') {
        return `+ ${line.key}: ${JSON.stringify(line.newValue)}`;
      }
      if (line.type === 'removed') {
        return `- ${line.key}: ${JSON.stringify(line.oldValue)}`;
      }
      // unchanged — show both if values differ, otherwise just the value
      const oldStr = JSON.stringify(line.oldValue);
      const newStr = JSON.stringify(line.newValue);
      if (oldStr !== newStr) {
        return `~ ${line.key}: ${oldStr} → ${newStr}`;
      }
      return `  ${line.key}: ${oldStr}`;
    })
    .join('\n');
}

export function summarizeDiff(diff: LifeDiffResult): string {
  return diff.summary.slice(0, 100);
}
