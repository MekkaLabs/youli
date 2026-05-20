import { NextResponse } from 'next/server';
import { createHabit } from '../../../../src/repositories/store';
import { interpretHabit } from '../../../../src/services/habit-llm';
import { requireAuth } from '@/lib/http';

export async function POST(req: Request) {
  const auth = await requireAuth();
  if (auth.error) return auth.response;
  const body = (await req.json().catch(() => ({}))) as { message?: string };
  const message = (body.message || '').trim();

  if (!message) {
    return NextResponse.json({ error: 'Mensagem vazia.' }, { status: 400 });
  }

  const interpreted = await interpretHabit(message);
  const habit = await createHabit(auth.user.id, {
    id: '',
    title: interpreted.title,
    frequency: interpreted.frequency,
    streak: interpreted.streak
  });

  return NextResponse.json({ habit, interpreted }, { status: 201 });
}
