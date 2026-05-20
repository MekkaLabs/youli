import { NextResponse } from 'next/server';
import { readDb } from '../../../../src/repositories/local-db';
import { requireAuth } from '@/lib/http';

export async function GET() {
  const auth = await requireAuth();
  if (auth.error) return auth.response;
  const db = readDb(auth.user.id);
  return NextResponse.json({
    profile: db.profile,
    connections: db.connections,
    tasks: db.tasks,
    habits: db.habits,
    goals: db.goals,
    calendar: db.calendar,
    fitness: db.fitness
  });
}
