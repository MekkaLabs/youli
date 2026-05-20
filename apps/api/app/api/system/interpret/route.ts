import { NextResponse } from 'next/server';
import { randomUUID } from 'node:crypto';
import { interpretBySection, type SystemSection } from '@/services/system-assistant';
import { addMemory, createGoal, createHabit, createInsight, createTask } from '@/repositories/store';
import { createCalendarEvent, createFitnessActivity } from '@/repositories/life-stream';
import { jsonError, requireAuth } from '@/lib/http';

export async function POST(req: Request) {
  const auth = await requireAuth();
  if (auth.error) return auth.response;
  try {
    const body = (await req.json().catch(() => ({}))) as { section?: SystemSection; message?: string };
    const section = body.section || 'overview';
    const message = (body.message || '').trim();

    if (!message) return NextResponse.json({ error: 'Mensagem vazia.' }, { status: 400 });

    const interpreted = interpretBySection(section, message);
    let created: unknown = null;

    if (interpreted.action.type === 'create_task') {
      created = await createTask({ id: randomUUID(), ...interpreted.action.payload });
    }

    if (interpreted.action.type === 'create_goal') {
      created = await createGoal({ id: randomUUID(), ...interpreted.action.payload });
    }

    if (interpreted.action.type === 'create_habit') {
      created = await createHabit({ id: randomUUID(), ...interpreted.action.payload });
    }

    if (interpreted.action.type === 'create_calendar_event') {
      created = createCalendarEvent({ id: randomUUID(), ...interpreted.action.payload });
    }

    if (interpreted.action.type === 'create_fitness_activity') {
      created = createFitnessActivity({ id: randomUUID(), ...interpreted.action.payload });
    }

    if (interpreted.action.type === 'create_insight') {
      created = await createInsight({ id: randomUUID(), ...interpreted.action.payload });
    }

    if (interpreted.action.type === 'create_memory') {
      await addMemory({ id: randomUUID(), ...interpreted.action.payload });
      created = interpreted.action.payload;
    }

    if (interpreted.action.type === 'note') {
      await addMemory({
        id: randomUUID(),
        userId: auth.user.id,
        type: 'event',
        text: interpreted.action.payload.text,
        createdAt: new Date().toISOString(),
      });
      created = interpreted.action.payload;
    }

    return NextResponse.json({ interpreted, created }, { status: 201 });
  } catch (err) {
    return jsonError('Erro ao interpretar mensagem', 500, err, 'POST /api/system/interpret');
  }
}
