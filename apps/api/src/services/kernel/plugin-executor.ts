import { performance } from 'node:perf_hooks';
import { runIntegrationTool } from '../integrations/integration-tools';
import { functionChoicePolicy, plannerGate, postToolFilter, preToolFilter } from './filters';
import { saveFunctionTrace } from './function-observability';
import type { KernelExecutionContext, KernelExecutionResult } from './types';

function invoke(functionId: string, userId: string) {
  if (!userId) return { ok: false, provider: 'unauthorized', data: null };
  if (functionId === 'calendar.getEvents') return runIntegrationTool(userId, 'calendar.getEvents');
  if (functionId === 'finance.getSummary') return runIntegrationTool(userId, 'finance.getSummary');
  if (functionId === 'fitness.getActivities') return runIntegrationTool(userId, 'fitness.getActivities');
  return { ok: false, provider: 'unknown', data: null };
}

export function executeKernelFunction(
  functionId: string,
  input: unknown,
  context: KernelExecutionContext,
  options?: { estimatedCost?: number; risk?: 'low' | 'medium' | 'high'; isLongTask?: boolean }
): KernelExecutionResult {
  const started = performance.now();
  const choice = functionChoicePolicy(functionId, context);
  if (!choice.allow) {
    return { ok: false, error: choice.reason, functionId, latencyMs: Math.round(performance.now() - started) };
  }

  const gate = plannerGate({
    estimatedCost: options?.estimatedCost ?? 0.01,
    risk: options?.risk ?? 'low',
    isLongTask: options?.isLongTask ?? false,
  });
  if (!gate.allowed) {
    return { ok: false, error: gate.reason, functionId, latencyMs: Math.round(performance.now() - started) };
  }

  const pre = preToolFilter(functionId, input, context);
  if (!pre.ok) {
    return { ok: false, error: pre.error, functionId, latencyMs: Math.round(performance.now() - started) };
  }

  const raw = invoke(functionId, context.userId ?? '');
  const post = postToolFilter(functionId, raw);
  const latencyMs = Math.round(performance.now() - started);

  const result: KernelExecutionResult = post.ok
    ? { ok: true, data: post.normalizedOutput, functionId, latencyMs }
    : { ok: false, error: post.error, functionId, latencyMs };

  saveFunctionTrace({
    functionId,
    threadId: context.threadId,
    area: context.area,
    startedAt: new Date(Date.now() - latencyMs).toISOString(),
    endedAt: new Date().toISOString(),
    latencyMs,
    success: result.ok,
    error: result.error,
  });
  return result;
}

