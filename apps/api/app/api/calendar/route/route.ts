import { NextResponse } from 'next/server';
import type { CalendarEvent } from '@youli/shared';
import { createCalendarEvent, listCalendarEvents } from '../../../../src/repositories/life-stream';

export async function GET() {
  return NextResponse.json(listCalendarEvents());
}

export async function POST(req: Request) {
  const body = (await req.json()) as Partial<CalendarEvent>;
  const created = createCalendarEvent({
    id: body.id || `cal-${Date.now()}`,
    source: body.source || 'mock',
    title: body.title || 'Novo evento',
    startsAt: body.startsAt || new Date().toISOString(),
    endsAt: body.endsAt || new Date(Date.now() + 60 * 60 * 1000).toISOString()
  });
  return NextResponse.json(created, { status: 201 });
}
