import { NextResponse } from 'next/server';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { interpretBySection, type SystemSection } from '@/services/system-assistant';
import { addMemory, createGoal, createHabit, createInsight, createTask } from '@/repositories/store';
import { createCalendarEvent, createFitnessActivity } from '@/repositories/life-stream';
import { jsonError, parseJsonBody, requireAuth } from '@/lib/http';

const InterpretSchema = z.object({
  section: z.enum([
    'overview', 'tarefas', 'metas', 'habitos', 'calendario',
    'insights', 'fitness', 'financeiro', 'perfil', 'memoria', 'orquestracao',
  ]).default('overview'),
  message: z.string().trim().min(1, 'mensagem vazia').max(4000),
});

export async function POST(req: Request) {
  const auth = await requireAuth();
  if (auth.error) return auth.response;
  const parsed = await parseJsonBody(req, InterpretSchema);
  if (!parsed.ok) return parsed.response;
  const { section, message } = parsed.data;
  try {
    const interpreted = interpretBySection(section as SystemSection, message);
    let created: unknown = null;

    if (interpreted.action.type === 'create_task') {
      created = await createTask(auth.user.id, { id: randomUUID(), ...interpreted.action.payload });
    }

    if (interpreted.action.type === 'create_goal') {
      created = await createGoal(auth.user.id, { id: randomUUID(), ...interpreted.action.payload });
    }

    if (interpreted.action.type === 'create_habit') {
      created = await createHabit(auth.user.id, { id: randomUUID(), ...interpreted.action.payload });
    }

    if (interpreted.action.type === 'create_calendar_event') {
      created = createCalendarEvent(auth.user.id, { id: randomUUID(), ...interpreted.action.payload });
    }

    if (interpreted.action.type === 'create_fitness_activity') {
      created = createFitnessActivity(auth.user.id, { id: randomUUID(), ...interpreted.action.payload });
    }

    if (interpreted.action.type === 'create_insight') {
      created = await createInsight(auth.user.id, { id: randomUUID(), ...interpreted.action.payload });
    }

    if (interpreted.action.type === 'create_memory') {
      await addMemory({ id: randomUUID(), ...interpreted.action.payload, userId: auth.user.id });
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
