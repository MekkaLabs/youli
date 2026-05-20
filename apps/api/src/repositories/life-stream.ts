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

export function listFitnessActivities(userId: string) {
  return readDb(userId).fitness;
}

export function createFitnessActivity(userId: string, activity: FitnessActivity) {
  const db = readDb(userId);
  db.fitness.unshift(activity);
  writeDb(userId, db);
  return activity;
}
