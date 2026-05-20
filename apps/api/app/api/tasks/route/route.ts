import { NextResponse } from 'next/server';
import { listTasks, createTask, updateTask } from '../../../../src/repositories/supabase/tasks';
import { prioritizeTask } from '../../../../src/services/ai-prioritizer';
import { requireAuth } from '@/lib/http';

export async function GET() {
  const auth = await requireAuth();
  if (auth.error) return auth.response;
  const tasks = await listTasks(auth.user.id);
  return NextResponse.json(tasks);
}

export async function POST(req: Request) {
  const auth = await requireAuth();
  if (auth.error) return auth.response;
  const body = await req.json().catch(() => ({}));
  const raw = {
    title: body.title || 'Nova tarefa',
    status: 'todo' as const,
    priority: body.priority ?? 3,
    nextStep: body.nextStep,
  };
  // Priorização via Claude
  const prioritized = await prioritizeTask({ id: 'tmp', ...raw });
  const task = await createTask(auth.user.id, prioritized);
  return NextResponse.json(task, { status: 201 });
}

export async function PATCH(req: Request) {
  const auth = await requireAuth();
  if (auth.error) return auth.response;
  const body = await req.json().catch(() => ({}));
  if (!body.id) return NextResponse.json({ error: 'id obrigatório' }, { status: 400 });
  const task = await updateTask(auth.user.id, body.id, body);
  return NextResponse.json(task);
}
