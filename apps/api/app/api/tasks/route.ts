/**
 * GET  /api/tasks  — lista tarefas do usuário logado
 * POST /api/tasks  — cria nova tarefa
 *
 * Stub in-memory por usuário enquanto não há tabela Supabase para tasks
 * (existe `apps/api/src/repositories/supabase/tasks.ts`, mas o roteamento
 * de fallback ainda não passa por lá — issue de follow-up).
 */
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { jsonError, parseJsonBody, requireAuth } from '@/lib/http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// ---------- Tipos ----------

type TaskPriority = 'low' | 'medium' | 'high' | 'critical';
type TaskStatus = 'todo' | 'doing' | 'done' | 'archived';

interface Task {
  id: string;
  userId: string;
  title: string;
  status: TaskStatus;
  priority: TaskPriority;
  xpReward: number;
  description?: string;
  dueAt?: string;
  createdAt: string;
}

const XP_BY_PRIORITY: Record<TaskPriority, number> = {
  low: 5,
  medium: 15,
  high: 30,
  critical: 50,
};

// ---------- Store ----------

// Map<userId, Task[]>. Persistência real fica para a integração com
// repositories/supabase/tasks.ts (story de follow-up).
const TASKS_BY_USER = new Map<string, Task[]>();

function seedFor(userId: string): Task[] {
  const now = new Date().toISOString();
  return [
    {
      id: `task_demo_${userId}_1`,
      userId,
      title: 'Revisar pitch deck do produto',
      status: 'doing',
      priority: 'high',
      xpReward: XP_BY_PRIORITY.high,
      createdAt: now,
    },
    {
      id: `task_demo_${userId}_2`,
      userId,
      title: 'Configurar CI/CD no GitHub Actions',
      status: 'todo',
      priority: 'medium',
      xpReward: XP_BY_PRIORITY.medium,
      createdAt: now,
    },
    {
      id: `task_demo_${userId}_3`,
      userId,
      title: 'Estudar 30min — React Native Reanimated',
      status: 'todo',
      priority: 'medium',
      xpReward: XP_BY_PRIORITY.medium,
      createdAt: now,
    },
  ];
}

function getUserTasks(userId: string): Task[] {
  if (!TASKS_BY_USER.has(userId)) {
    TASKS_BY_USER.set(userId, seedFor(userId));
  }
  return TASKS_BY_USER.get(userId)!;
}

// ---------- Schemas ----------

const CreateTaskSchema = z.object({
  title: z.string().min(1, 'title é obrigatório').max(200),
  description: z.string().max(2000).optional(),
  status: z.enum(['todo', 'doing', 'done', 'archived']).default('todo'),
  priority: z.enum(['low', 'medium', 'high', 'critical']).default('medium'),
  dueAt: z.string().datetime().optional(),
});

// ---------- Handlers ----------

export async function GET() {
  const auth = await requireAuth();
  if (auth.error) return auth.response;
  try {
    return NextResponse.json({ tasks: getUserTasks(auth.user.id) });
  } catch (err) {
    return jsonError('Falha ao listar tarefas', 500, err, 'GET /api/tasks');
  }
}

export async function POST(req: Request) {
  const auth = await requireAuth();
  if (auth.error) return auth.response;

  const parsed = await parseJsonBody(req, CreateTaskSchema);
  if (!parsed.ok) return parsed.response;
  const body = parsed.data;

  try {
    const task: Task = {
      id: `task_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      userId: auth.user.id,
      title: body.title,
      description: body.description,
      status: body.status,
      priority: body.priority,
      dueAt: body.dueAt,
      xpReward: XP_BY_PRIORITY[body.priority],
      createdAt: new Date().toISOString(),
    };
    const list = getUserTasks(auth.user.id);
    list.unshift(task);
    return NextResponse.json({ task }, { status: 201 });
  } catch (err) {
    return jsonError('Falha ao criar tarefa', 500, err, 'POST /api/tasks');
  }
}
