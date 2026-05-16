import { z } from 'zod';
import { getKernelFunction } from './function-registry';
import { KernelExecutionContext } from './types';

export interface PreToolValidationResult {
  ok: boolean;
  error?: string;
  normalizedInput?: unknown;
}

export function preToolFilter(
  functionId: string,
  input: unknown,
  context: KernelExecutionContext
): PreToolValidationResult {
  const fn = getKernelFunction(functionId);
  if (!fn) return { ok: false, error: 'function_not_found' };
  if (fn.area !== context.area && context.area !== 'dashboard') {
    return { ok: false, error: 'function_area_scope_violation' };
  }
  const parsed = fn.inputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: `invalid_input:${parsed.error.issues[0]?.message || 'unknown'}` };
  if (fn.policy.requiresConfirmation && context.source !== 'system') {
    const requested = (parsed.data as { confirm?: boolean }).confirm;
    if (requested !== true) return { ok: false, error: 'confirmation_required' };
  }
  return { ok: true, normalizedInput: parsed.data };
}

export function postToolFilter(functionId: string, output: unknown): { ok: boolean; error?: string; normalizedOutput?: unknown } {
  const fn = getKernelFunction(functionId);
  if (!fn) return { ok: false, error: 'function_not_found' };
  const parsed = fn.outputSchema.safeParse(output);
  if (!parsed.success) {
    return { ok: false, error: 'invalid_output' };
  }
  return { ok: true, normalizedOutput: parsed.data };
}

export function plannerGate(input: {
  estimatedCost: number;
  risk: 'low' | 'medium' | 'high';
  isLongTask: boolean;
}): { allowed: boolean; reason: string } {
  if (input.estimatedCost > 0.15) return { allowed: false, reason: 'cost_gate_blocked' };
  if (input.risk === 'high' && input.isLongTask) return { allowed: false, reason: 'risk_gate_blocked' };
  return { allowed: true, reason: 'allowed' };
}

export function functionChoicePolicy(functionId: string, context: KernelExecutionContext) {
  const fn = getKernelFunction(functionId);
  if (!fn) return { allow: false, mode: 'deny' as const, reason: 'missing_function' };
  if (fn.policy.requiresConfirmation && context.source !== 'system') {
    return { allow: true, mode: 'confirm-first' as const, reason: 'policy_confirmation' };
  }
  return { allow: true, mode: 'auto' as const, reason: 'policy_auto' };
}

