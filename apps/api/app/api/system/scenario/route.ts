import { NextResponse } from 'next/server';
import { randomUUID } from 'node:crypto';
import { createTask, createGoal, createHabit, createInsight } from '../../../../src/repositories/store';
import { createCalendarEvent, createFitnessActivity } from '../../../../src/repositories/life-stream';
import { requireAuth } from '@/lib/http';

export async function POST() {
  const auth = await requireAuth();
  if (auth.error) return auth.response;
  const userId = auth.user.id;
  await createTask(userId, { id: randomUUID(), title: 'Executar sprint de validação', status: 'todo', priority: 5, nextStep: 'Fechar 3 feedbacks reais hoje.' });
  await createGoal(userId, { id: randomUUID(), objectiveId: 'o1', title: 'Fechar 5 usuários teste ativos', progress: 10 });
  await createHabit(userId, { id: randomUUID(), title: 'Revisão de 15 min no fim do dia', frequency: 'daily', streak: 0 });
  createCalendarEvent(userId, { id: randomUUID(), source: 'native', title: 'Bloco teste de onboarding', startsAt: new Date().toISOString(), endsAt: new Date(Date.now() + 45 * 60 * 1000).toISOString() });
  createFitnessActivity(userId, { id: randomUUID(), source: 'strava', type: 'Muay Thai', durationMin: 55, intensity: 'high', startedAt: new Date().toISOString() });
  await createInsight(userId, { id: randomUUID(), createdAt: new Date().toISOString(), summary: 'Cenário de teste aplicado com sucesso', actions: ['Validar dashboards por área'], energy: 'high' });
  return NextResponse.json({ ok: true });
}
