import { NextResponse } from 'next/server';
import { createHabit } from '../../../../src/repositories/store';
import { interpretHabitMessage } from '../../../../src/services/habit-llm';

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as { message?: string };
  const message = (body.message || '').trim();

  if (!message) {
    return NextResponse.json({ error: 'Mensagem vazia.' }, { status: 400 });
  }

  const interpreted = interpretHabitMessage(message);
  const habit = await createHabit({
    id: '',
    title: interpreted.title,
    frequency: interpreted.frequency,
    streak: interpreted.streak
  });

  return NextResponse.json({ habit, interpreted }, { status: 201 });
}
