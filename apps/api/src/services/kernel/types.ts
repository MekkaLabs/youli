import { z } from 'zod';

export const KernelAreaSchema = z.enum([
  'dashboard',
  'tarefas',
  'habitos',
  'metas',
  'financeiro',
  'fitness',
  'calendario',
  'insights',
  'foco',
  'perfil',
]);

export type KernelArea = z.infer<typeof KernelAreaSchema>;

export const KernelFunctionPolicySchema = z.object({
  auto: z.boolean(),
  requiresConfirmation: z.boolean(),
  maxRisk: z.enum(['low', 'medium', 'high'])
});

export interface KernelFunctionDefinition {
  id: string;
  plugin: string;
  name: string;
  description: string;
  area: KernelArea;
  inputSchema: z.ZodTypeAny;
  outputSchema: z.ZodTypeAny;
  policy: z.infer<typeof KernelFunctionPolicySchema>;
}

export interface KernelExecutionContext {
  threadId: string;
  area: KernelArea;
  userId?: string;
  source: 'orchestrator' | 'copilot' | 'system';
}

export interface KernelExecutionResult<T = unknown> {
  ok: boolean;
  data?: T;
  error?: string;
  functionId: string;
  latencyMs: number;
}

