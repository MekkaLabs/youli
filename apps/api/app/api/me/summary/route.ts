import { NextResponse } from 'next/server';
import { readDb } from '../../../../src/repositories/local-db';

export async function GET() {
  const db = readDb();
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
