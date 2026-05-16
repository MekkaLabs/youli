import { NextResponse } from 'next/server';
import { listHabits, createHabit, checkinHabit, deleteHabit } from '../../../../src/repositories/supabase/habits';
import { interpretHabit } from '../../../../src/services/habit-llm';
import { readDb } from '../../../../src/repositories/local-db';

export async function GET() {
  const habits = await listHabits();
  return NextResponse.json(habits);
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const db = readDb();
  const profile = db.profile;
  const interpreted = await interpretHabit(body.title || body.message || 'Novo hábito', profile);
  const habit = await createHabit(interpreted);
  return NextResponse.json(habit, { status: 201 });
}

export async function PATCH(req: Request) {
  const body = await req.json().catch(() => ({}));
  if (!body.id) return NextResponse.json({ error: 'id obrigatório' }, { status: 400 });
  if (body.action === 'checkin') {
    const habit = await checkinHabit(body.id);
    return NextResponse.json(habit);
  }
  return NextResponse.json({ error: 'ação desconhecida' }, { status: 400 });
}

export async function DELETE(req: Request) {
  const body = await req.json().catch(() => ({}));
  const id = typeof body?.id === 'string' ? body.id : '';
  if (!id) return NextResponse.json({ error: 'id obrigatório' }, { status: 400 });
  await deleteHabit(id);
  return NextResponse.json({ ok: true });
}
