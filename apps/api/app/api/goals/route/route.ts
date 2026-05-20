import { NextResponse } from 'next/server';
import { listGoals, createGoal, updateGoalProgress, deleteGoal } from '../../../../src/repositories/supabase/goals';
import { requireAuth } from '@/lib/http';

export async function GET() {
  const auth = await requireAuth();
  if (auth.error) return auth.response;
  const goals = await listGoals(auth.user.id);
  return NextResponse.json(goals);
}

export async function POST(req: Request) {
  const auth = await requireAuth();
  if (auth.error) return auth.response;
  const body = await req.json().catch(() => ({}));
  const goal = await createGoal(auth.user.id, { objectiveId: 'o1', title: body.title || 'Nova meta', progress: 0 });
  return NextResponse.json(goal, { status: 201 });
}

export async function PATCH(req: Request) {
  const auth = await requireAuth();
  if (auth.error) return auth.response;
  const body = await req.json().catch(() => ({}));
  if (!body.id) return NextResponse.json({ error: 'id obrigatório' }, { status: 400 });
  const goal = await updateGoalProgress(auth.user.id, body.id, body.progress ?? 0);
  return NextResponse.json(goal);
}

export async function DELETE(req: Request) {
  const auth = await requireAuth();
  if (auth.error) return auth.response;
  const body = await req.json().catch(() => ({}));
  const id = typeof body?.id === 'string' ? body.id : '';
  if (!id) return NextResponse.json({ error: 'id obrigatório' }, { status: 400 });
  await deleteGoal(auth.user.id, id);
  return NextResponse.json({ ok: true });
}
