import type { LifeArea } from '../agents/agent-definitions';

export type Mode =
  | 'routing'
  | 'analysis'
  | 'synthesis'
  | 'react_observe'
  | 'self_eval'
  | 'sop_step'
  | 'tot_branch'
  | 'workflow_plan'
  | 'skill_extract';

/**
 * Policy matrix for model selection.
 *
 * fast  → claude-3-5-haiku-latest  (low latency, lower cost)
 * strong → claude-sonnet-4-6       (higher reasoning, higher cost)
 *
 * Mode rules (take priority over area rules):
 *   routing      → always fast   (hot path, just classify)
 *   react_observe → fast         (observe step in ReAct loop — quick scan)
 *   self_eval    → fast          (evaluation pass, haiku is sufficient)
 *   sop_step     → fast          (individual SOP step execution)
 *   synthesis    → always strong (cross-area synthesis needs reasoning)
 *   tot_branch   → strong        (Tree-of-Thought branching needs depth)
 *   workflow_plan → strong       (multi-step planning needs reasoning)
 *   skill_extract → strong       (semantic extraction needs precision)
 *   analysis     → area-driven   (see area rules below)
 *
 * Area rules (applied when mode === 'analysis'):
 *   financeiro, metas, insights → strong (high-stakes decisions)
 *   others                      → fast
 */
export function pickModel(mode: Mode, area: LifeArea): string {
  const fast = process.env.YOULI_MODEL_FAST || 'claude-3-5-haiku-latest';
  const strong = process.env.YOULI_MODEL_STRONG || 'claude-sonnet-4-6';

  // Fast-path modes
  if (mode === 'routing') return fast;
  if (mode === 'react_observe') return fast;
  if (mode === 'self_eval') return fast;
  if (mode === 'sop_step') return fast;

  // Strong-path modes
  if (mode === 'synthesis') return strong;
  if (mode === 'tot_branch') return strong;
  if (mode === 'workflow_plan') return strong;
  if (mode === 'skill_extract') return strong;

  // mode === 'analysis': area-driven
  if (area === 'financeiro' || area === 'metas' || area === 'insights') return strong;
  return fast;
}

