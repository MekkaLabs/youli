import { NextResponse } from 'next/server';
import { randomUUID } from 'node:crypto';
import { createTask, createGoal, createHabit, createInsight } from '../../../../src/repositories/store';
import { createCalendarEvent, createFitnessActivity } from '../../../../src/repositories/life-stream';

export async function POST() {
  await createTask({ id: randomUUID(), title: 'Executar sprint de validação', status: 'todo', priority: 5, nextStep: 'Fechar 3 feedbacks reais hoje.' });
  await createGoal({ id: randomUUID(), objectiveId: 'o1', title: 'Fechar 5 usuários teste ativos', progress: 10 });
  await createHabit({ id: randomUUID(), title: 'Revisão de 15 min no fim do dia', frequency: 'daily', streak: 0 });
  createCalendarEvent({ id: randomUUID(), source: 'native', title: 'Bloco teste de onboarding', startsAt: new Date().toISOString(), endsAt: new Date(Date.now() + 45 * 60 * 1000).toISOString() });
  createFitnessActivity({ id: randomUUID(), source: 'strava', type: 'Muay Thai', durationMin: 55, intensity: 'high', startedAt: new Date().toISOString() });
  await createInsight({ id: randomUUID(), createdAt: new Date().toISOString(), summary: 'Cenário de teste aplicado com sucesso', actions: ['Validar dashboards por área'], energy: 'high' });
  return NextResponse.json({ ok: true });
}
