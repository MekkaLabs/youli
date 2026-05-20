import { NextResponse } from 'next/server';
import { listHabits, createHabit, checkinHabit, deleteHabit } from '../../../../src/repositories/supabase/habits';
import { interpretHabit } from '../../../../src/services/habit-llm';
import { readDb } from '../../../../src/repositories/local-db';
import { requireAuth } from '@/lib/http';

export async function GET() {
  const auth = await requireAuth();
  if (auth.error) return auth.response;
  const habits = await listHabits(auth.user.id);
  return NextResponse.json(habits);
}

export async function POST(req: Request) {
  const auth = await requireAuth();
  if (auth.error) return auth.response;
  const body = await req.json().catch(() => ({}));
  const db = readDb(auth.user.id);
  const profile = db.profile;
  const interpreted = await interpretHabit(body.title || body.message || 'Novo hábito', profile);
  const habit = await createHabit(auth.user.id, interpreted);
  return NextResponse.json(habit, { status: 201 });
}

export async function PATCH(req: Request) {
  const auth = await requireAuth();
  if (auth.error) return auth.response;
  const body = await req.json().catch(() => ({}));
  if (!body.id) return NextResponse.json({ error: 'id obrigatório' }, { status: 400 });
  if (body.action === 'checkin') {
    const habit = await checkinHabit(auth.user.id, body.id);
    return NextResponse.json(habit);
  }
  return NextResponse.json({ error: 'ação desconhecida' }, { status: 400 });
}

export async function DELETE(req: Request) {
  const auth = await requireAuth();
  if (auth.error) return auth.response;
  const body = await req.json().catch(() => ({}));
  const id = typeof body?.id === 'string' ? body.id : '';
  if (!id) return NextResponse.json({ error: 'id obrigatório' }, { status: 400 });
  await deleteHabit(auth.user.id, id);
  return NextResponse.json({ ok: true });
}
