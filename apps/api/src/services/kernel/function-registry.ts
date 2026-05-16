import { z } from 'zod';
import { KernelFunctionDefinition } from './types';

const AnySchema = z.any();

export const KernelFunctionRegistry: KernelFunctionDefinition[] = [
  {
    id: 'calendar.getEvents',
    plugin: 'calendar',
    name: 'getEvents',
    description: 'Retorna eventos do calendario',
    area: 'calendario',
    inputSchema: z.object({}).optional().default({}),
    outputSchema: AnySchema,
    policy: { auto: true, requiresConfirmation: false, maxRisk: 'low' },
  },
  {
    id: 'finance.getSummary',
    plugin: 'finance',
    name: 'getSummary',
    description: 'Retorna resumo financeiro',
    area: 'financeiro',
    inputSchema: z.object({}).optional().default({}),
    outputSchema: AnySchema,
    policy: { auto: true, requiresConfirmation: false, maxRisk: 'medium' },
  },
  {
    id: 'fitness.getActivities',
    plugin: 'fitness',
    name: 'getActivities',
    description: 'Retorna atividades fitness',
    area: 'fitness',
    inputSchema: z.object({}).optional().default({}),
    outputSchema: AnySchema,
    policy: { auto: true, requiresConfirmation: false, maxRisk: 'low' },
  },
  {
    id: 'tasks.mutate',
    plugin: 'tasks',
    name: 'mutateTask',
    description: 'Atualiza tarefas',
    area: 'tarefas',
    inputSchema: z.object({
      action: z.enum(['create', 'update', 'delete']),
      payload: z.record(z.any()),
    }),
    outputSchema: AnySchema,
    policy: { auto: false, requiresConfirmation: true, maxRisk: 'high' },
  }
];

export function getKernelFunction(functionId: string) {
  return KernelFunctionRegistry.find((f) => f.id === functionId) || null;
}

