/**
 * GET /api/tasks    — lista tarefas do usuário
 * POST /api/tasks   — cria nova tarefa
 */
import { NextRequest, NextResponse } from 'next/server';

// Stub in-memory store (substitua por Supabase em produção)
const TASKS: any[] = [
  { id: 'task_demo_1', title: 'Revisar pitch deck do produto', status: 'doing', priority: 'high', xpReward: 30, createdAt: new Date().toISOString() },
  { id: 'task_demo_2', title: 'Configurar CI/CD no GitHub Actions', status: 'todo', priority: 'medium', xpReward: 15, createdAt: new Date().toISOString() },
  { id: 'task_demo_3', title: 'Estudar 30min — React Native Reanimated', status: 'todo', priority: 'medium', xpReward: 15, createdAt: new Date().toISOString() },
];

export async function GET() {
  return NextResponse.json({ tasks: TASKS });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const task = {
    id: `task_${Date.now()}`,
    ...body,
    createdAt: new Date().toISOString(),
    xpReward: { low: 5, medium: 15, high: 30, critical: 50 }[body.priority as string] ?? 15,
  };
  TASKS.unshift(task);
  return NextResponse.json({ task }, { status: 201 });
}
