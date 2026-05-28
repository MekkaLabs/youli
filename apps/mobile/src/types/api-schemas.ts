/**
 * Schemas Zod para as respostas da API consumidas pelo mobile.
 *
 * Use `safeParse` (não `parse`) nos hooks para que respostas inesperadas
 * NÃO crashem o app — log + fallback para defaults. Os tipos exportados
 * (`ApiTask`, `ApiHabit`, etc.) substituem os `any` que existiam.
 */
import { z } from 'zod';

// ---------- Primitivos comuns ----------

export const PrioritySchema = z.enum(['low', 'medium', 'high', 'critical']);
export const TaskStatusSchema = z.enum(['todo', 'doing', 'done', 'archived']);

// Aceita string ou number — a API às vezes retorna número.
const FlexibleId = z.union([z.string(), z.number()]).transform((v) => String(v));

// ---------- Task ----------

export const ApiTaskSchema = z
  .object({
    id: FlexibleId,
    title: z.string().min(1).catch('Nova tarefa'),
    status: z.enum(['todo', 'doing', 'done', 'archived']).optional().catch('todo'),
    // priority pode vir como string ('high') ou número (1..5) — aceitar ambos.
    priority: z.union([PrioritySchema, z.number()]).optional(),
    description: z.string().optional(),
    nextStep: z.string().optional(),
    xpReward: z.number().optional(),
    createdAt: z.string().optional(),
    dueAt: z.string().optional(),
  })
  .passthrough();

export type ApiTask = z.infer<typeof ApiTaskSchema>;

export const ApiTaskListSchema = z.object({
  tasks: z.array(ApiTaskSchema).default([]),
});

// ---------- Habit ----------

export const ApiHabitSchema = z
  .object({
    id: FlexibleId,
    title: z.string().catch('Hábito'),
    streak: z.number().nonnegative().optional().catch(0),
    frequency: z.enum(['daily', 'weekly']).optional(),
    completedToday: z.boolean().optional(),
    nextCheckIn: z.string().optional(),
  })
  .passthrough();

export type ApiHabit = z.infer<typeof ApiHabitSchema>;

export const ApiHabitListSchema = z.object({
  habits: z.array(ApiHabitSchema).default([]),
});

// ---------- Goal ----------

export const GoalStatusSchema = z.enum(['active', 'paused', 'achieved', 'abandoned']);

export const ApiGoalSchema = z
  .object({
    id: FlexibleId,
    title: z.string().catch('Meta'),
    progress: z.number().min(0).max(100).optional().catch(0),
    status: GoalStatusSchema.optional().catch('active'),
    deadline: z.string().optional(),
    category: z.string().optional(),
  })
  .passthrough();

export type ApiGoal = z.infer<typeof ApiGoalSchema>;

export const ApiGoalListSchema = z.object({
  goals: z.array(ApiGoalSchema).default([]),
});

// ---------- Insight ----------

export const ApiInsightSchema = z
  .object({
    id: FlexibleId,
    title: z.string().catch('Insight'),
    body: z.string().optional(),
    persona: z.string().optional(),
    severity: z.enum(['info', 'warn', 'critical']).optional(),
    createdAt: z.string().optional(),
  })
  .passthrough();

export type ApiInsight = z.infer<typeof ApiInsightSchema>;

export const ApiInsightListSchema = z.object({
  insights: z.array(ApiInsightSchema).default([]),
});

// ---------- Notification (smart / life-health) ----------

export const ApiTopGapSchema = z
  .object({
    area: z.string(),
    metric: z.string(),
    gapMagnitude: z.number(),
    priority: z.string(),
    requirement: z.string(),
  })
  .passthrough();

export type ApiTopGap = z.infer<typeof ApiTopGapSchema>;

export const ApiLifeHealthSchema = z
  .object({
    userId: z.string(),
    lifeHealthScore: z.number().default(0),
    ancScore: z.number().default(0),
    maintainabilityScore: z.number().default(0),
    topGaps: z.array(ApiTopGapSchema).default([]),
    criticalAreas: z.array(z.string()).default([]),
    topPriorities: z.array(z.string()).default([]),
  })
  .passthrough();

export type ApiLifeHealth = z.infer<typeof ApiLifeHealthSchema>;

export const ApiSmartNotificationSchema = z
  .object({
    id: FlexibleId,
    title: z.string().catch('Notificação'),
    message: z.string().optional(),
    priority: z.enum(['low', 'medium', 'high', 'critical']).optional(),
    agent: z.string().optional(),
    agentEmoji: z.string().optional(),
    createdAt: z.string().optional(),
    read: z.boolean().optional(),
  })
  .passthrough();

export type ApiSmartNotification = z.infer<typeof ApiSmartNotificationSchema>;

// ---------- Calendar ----------

export const ApiCalendarEventSchema = z
  .object({
    id: FlexibleId,
    title: z.string().catch('Evento'),
    startsAt: z.string().optional(),
    endsAt: z.string().optional(),
    location: z.string().optional(),
    source: z.string().optional(),
  })
  .passthrough();

export type ApiCalendarEvent = z.infer<typeof ApiCalendarEventSchema>;

export const ApiCalendarEventListSchema = z.object({
  events: z.array(ApiCalendarEventSchema).default([]),
});

// ---------- Helpers ----------

/**
 * Tenta parsear com o schema. Se falhar, loga e retorna o fallback.
 * Use isso em vez de `parse` para nunca crashar o app por causa de
 * uma resposta de API inesperada.
 */
export function safeParseWithFallback<S extends z.ZodTypeAny>(
  schema: S,
  data: unknown,
  fallback: z.infer<S>,
  scope: string
): z.infer<S> {
  const result = schema.safeParse(data);
  if (result.success) return result.data;
  if (__DEV__) {
     
    console.warn(`[${scope}] schema mismatch`, result.error.flatten());
  }
  return fallback;
}
