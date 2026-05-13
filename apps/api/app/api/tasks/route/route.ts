import { NextResponse } from 'next/server';
import { listTasks, createTask, updateTask } from '../../../../src/repositories/supabase/tasks';
import { prioritizeTask } from '../../../../src/services/ai-prioritizer';

export async function GET() {
  const tasks = await listTasks();
  return NextResponse.json(tasks);
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const raw = {
    title: body.title || 'Nova tarefa',
    status: 'todo' as const,
    priority: body.priority ?? 3,
    nextStep: body.nextStep,
  };
  // Priorização via Claude
  const prioritized = await prioritizeTask({ id: 'tmp', ...raw });
  const task = await createTask(prioritized);
  return NextResponse.json(task, { status: 201 });
}

export async function PATCH(req: Request) {
  const body = await req.json().catch(() => ({}));
  if (!body.id) return NextResponse.json({ error: 'id obrigatório' }, { status: 400 });
  const task = await updateTask(body.id, body);
  return NextResponse.json(task);
}
