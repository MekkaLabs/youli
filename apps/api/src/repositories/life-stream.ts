import type { CalendarEvent, FitnessActivity } from '@youli/shared';
import { readDb, writeDb } from './local-db';

export function listCalendarEvents(userId: string) {
  return readDb(userId).calendar;
}

export function createCalendarEvent(userId: string, event: CalendarEvent) {
  const db = readDb(userId);
  db.calendar.unshift(event);
  writeDb(userId, db);
  return event;
}

/**
 * Upsert idempotente de eventos por id (ex.: eventos do Google Calendar,
 * que reusam `gcal_<id>`). Substitui os existentes e adiciona os novos.
 * Retorna quantos foram criados/atualizados.
 */
export function upsertCalendarEvents(userId: string, events: CalendarEvent[]) {
  if (events.length === 0) return { upserted: 0 };
  const db = readDb(userId);
  const byId = new Map(db.calendar.map((e) => [e.id, e]));
  for (const ev of events) byId.set(ev.id, ev);
  db.calendar = Array.from(byId.values()).sort(
    (a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime(),
  );
  writeDb(userId, db);
  return { upserted: events.length };
}

export function listFitnessActivities(userId: string) {
  return readDb(userId).fitness;
}

export function createFitnessActivity(userId: string, activity: FitnessActivity) {
  const db = readDb(userId);
  db.fitness.unshift(activity);
  writeDb(userId, db);
  return activity;
}
