import { NextResponse } from 'next/server';
import { listGoals, createGoal, updateGoalProgress } from '../../../../src/repositories/supabase/goals';

export async function GET() {
  const goals = await listGoals();
  return NextResponse.json(goals);
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const goal = await createGoal({ objectiveId: 'o1', title: body.title || 'Nova meta', progress: 0 });
  return NextResponse.json(goal, { status: 201 });
}

export async function PATCH(req: Request) {
  const body = await req.json().catch(() => ({}));
  if (!body.id) return NextResponse.json({ error: 'id obrigatório' }, { status: 400 });
  const goal = await updateGoalProgress(body.id, body.progress ?? 0);
  return NextResponse.json(goal);
}
