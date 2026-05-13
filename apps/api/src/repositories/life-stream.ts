import type { CalendarEvent, FitnessActivity } from '@youli/shared';
import { readDb, writeDb } from './local-db';

export function listCalendarEvents() {
  return readDb().calendar;
}

export function createCalendarEvent(event: CalendarEvent) {
  const db = readDb();
  db.calendar.unshift(event);
  writeDb(db);
  return event;
}

export function listFitnessActivities() {
  return readDb().fitness;
}

export function createFitnessActivity(activity: FitnessActivity) {
  const db = readDb();
  db.fitness.unshift(activity);
  writeDb(db);
  return activity;
}
