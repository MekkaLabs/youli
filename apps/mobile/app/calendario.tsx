import { useEffect, useState } from 'react';
import { Text } from 'react-native';
import { Screen } from '../src/components/Screen';
import { api } from '../src/services/api';
import type { CalendarEvent } from '@youli/shared';

export default function Calendario() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  useEffect(() => { api<any>('/api/dashboard').then((x) => setEvents(x.dashboard.events || [])).catch(() => setEvents([])); }, []);
  return <Screen title="Calendário">{events.map((e) => <Text key={e.id}>{e.title}</Text>)}</Screen>;
}
