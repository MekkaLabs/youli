/**
 * useCalendar — eventos do dia + blocos de foco sugeridos
 *
 * Fontes (por ordem de prioridade):
 * 1. /api/calendar — eventos do Google Calendar via OAuth
 * 2. expo-calendar — calendário nativo do dispositivo (iOS/Android)
 * 3. Mock local com eventos de exemplo
 */

import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3002';
const CACHE_KEY = '@youli:calendar_cache';
const CACHE_TTL = 15 * 60 * 1000; // 15 minutos

export interface CalendarEvent {
  id: string;
  title: string;
  startTime: string;  // HH:MM
  endTime: string;    // HH:MM
  startIso: string;
  endIso: string;
  color: string;
  source: 'google' | 'native' | 'youli' | 'mock';
  location?: string;
  isAllDay: boolean;
  isBusy: boolean;    // bloqueia foco?
}

export interface FocusBlock {
  startTime: string;
  endTime: string;
  durationMin: number;
  quality: 'deep' | 'shallow' | 'unavailable';
  label: string;
}

function fmtTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', hour12: false });
}

function generateMockEvents(today: string): CalendarEvent[] {
  return [
    {
      id: 'mock1',
      title: '☀️ Bloco de foco — Deep Work',
      startTime: '08:00', endTime: '10:00',
      startIso: `${today}T08:00:00`, endIso: `${today}T10:00:00`,
      color: '#7C3AED', source: 'youli', isAllDay: false, isBusy: true,
    },
    {
      id: 'mock2',
      title: '📋 Reunião de alinhamento',
      startTime: '10:30', endTime: '11:30',
      startIso: `${today}T10:30:00`, endIso: `${today}T11:30:00`,
      color: '#0891B2', source: 'mock', isAllDay: false, isBusy: true,
    },
    {
      id: 'mock3',
      title: '🏋️ Treino',
      startTime: '18:00', endTime: '19:00',
      startIso: `${today}T18:00:00`, endIso: `${today}T19:00:00`,
      color: '#DC2626', source: 'mock', isAllDay: false, isBusy: true,
    },
  ];
}

function detectFocusBlocks(events: CalendarEvent[]): FocusBlock[] {
  const blocks: FocusBlock[] = [];
  const busySlots = events
    .filter(e => e.isBusy && !e.isAllDay)
    .map(e => ({ start: e.startIso, end: e.endIso }))
    .sort((a, b) => a.start.localeCompare(b.start));

  const dayStart = 7 * 60;  // 07:00
  const dayEnd = 22 * 60;   // 22:00

  const toMin = (iso: string) => {
    const d = new Date(iso);
    return d.getHours() * 60 + d.getMinutes();
  };

  let cursor = dayStart;

  for (const slot of busySlots) {
    const slotStart = toMin(slot.start);
    const slotEnd = toMin(slot.end);
    const gap = slotStart - cursor;

    if (gap >= 30) {
      const h = (m: number) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
      blocks.push({
        startTime: h(cursor),
        endTime: h(slotStart),
        durationMin: gap,
        quality: gap >= 90 ? 'deep' : 'shallow',
        label: gap >= 90 ? '🧠 Bloco de foco profundo' : '⚡ Janela rápida',
      });
    }
    cursor = Math.max(cursor, slotEnd);
  }

  // Bloco após o último evento
  if (cursor < dayEnd) {
    const gap = dayEnd - cursor;
    if (gap >= 30) {
      const h = (m: number) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
      blocks.push({
        startTime: h(cursor),
        endTime: h(dayEnd),
        durationMin: gap,
        quality: gap >= 90 ? 'deep' : 'shallow',
        label: gap >= 90 ? '🧠 Bloco de foco profundo' : '⚡ Janela rápida',
      });
    }
  }

  return blocks.slice(0, 4);
}

export function useCalendar() {
  const today = new Date().toISOString().split('T')[0];
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [focusBlocks, setFocusBlocks] = useState<FocusBlock[]>([]);
  const [loading, setLoading] = useState(false);
  const [source, setSource] = useState<'api' | 'native' | 'mock'>('mock');

  const loadNativeCalendar = useCallback(async (): Promise<CalendarEvent[]> => {
    try {
      // Dynamic optional import — não está em package.json de propósito (degrada para fallback).
      // eslint-disable-next-line import/no-unresolved
      const Calendar = await import('expo-calendar');
      const { status } = await Calendar.requestCalendarPermissionsAsync();
      if (status !== 'granted') return [];

      const calendars = (await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT)) as { id: string }[];
      const ids = calendars.map((c) => c.id);

      const start = new Date(today + 'T00:00:00');
      const end = new Date(today + 'T23:59:59');

      type NativeEvent = {
        id: string;
        title?: string;
        startDate: string | Date;
        endDate: string | Date;
        color?: string;
        location?: string;
        allDay?: boolean;
        availability?: string;
      };
      const rawEvents = (await Calendar.getEventsAsync(ids, start, end)) as unknown as NativeEvent[];
      const isoize = (d: string | Date) => (typeof d === 'string' ? d : d.toISOString());
      return rawEvents.map((e) => ({
        id: e.id,
        title: e.title || 'Sem título',
        startTime: fmtTime(isoize(e.startDate)),
        endTime: fmtTime(isoize(e.endDate)),
        startIso: isoize(e.startDate),
        endIso: isoize(e.endDate),
        color: e.color ?? '#7C3AED',
        source: 'native' as const,
        location: e.location,
        isAllDay: e.allDay ?? false,
        isBusy: (e.availability ?? 'busy') !== 'free',
      }));
    } catch {
      return [];
    }
  }, [today]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      // 1. Tenta API (Google Calendar via OAuth)
      const res = await fetch(`${API_BASE}/api/calendar?date=${today}`, {
        cache: 'no-store',
      }).catch(() => null);

      if (res?.ok) {
        const data = (await res.json()) as {
          events?: (Partial<CalendarEvent> & {
            startIso?: string;
            endIso?: string;
            start?: string;
            end?: string;
          })[];
        };
        if (data?.events?.length) {
          const mapped: CalendarEvent[] = data.events.map((e) => ({
            ...(e as CalendarEvent),
            startTime: e.startTime ?? fmtTime(e.startIso ?? e.start ?? ''),
            endTime: e.endTime ?? fmtTime(e.endIso ?? e.end ?? ''),
            source: 'google' as const,
            isBusy: true,
            isAllDay: e.isAllDay ?? false,
          }));
          setEvents(mapped);
          setFocusBlocks(detectFocusBlocks(mapped));
          setSource('api');
          await AsyncStorage.setItem(CACHE_KEY, JSON.stringify({ events: mapped, ts: Date.now() }));
          return;
        }
      }

      // 2. Tenta calendário nativo
      const native = await loadNativeCalendar();
      if (native.length) {
        setEvents(native);
        setFocusBlocks(detectFocusBlocks(native));
        setSource('native');
        return;
      }

      // 3. Verifica cache
      const cached = await AsyncStorage.getItem(CACHE_KEY);
      if (cached) {
        const { events: cachedEvents, ts } = JSON.parse(cached);
        if (Date.now() - ts < CACHE_TTL) {
          setEvents(cachedEvents);
          setFocusBlocks(detectFocusBlocks(cachedEvents));
          return;
        }
      }

      // 4. Mock
      const mock = generateMockEvents(today);
      setEvents(mock);
      setFocusBlocks(detectFocusBlocks(mock));
      setSource('mock');
    } finally {
      setLoading(false);
    }
  }, [today, loadNativeCalendar]);

  useEffect(() => { load(); }, []);

  const todayLabel = new Date().toLocaleDateString('pt-BR', {
    weekday: 'long', day: 'numeric', month: 'long',
  });

  const currentEvent = events.find(e => {
    const now = new Date();
    return new Date(e.startIso) <= now && new Date(e.endIso) >= now;
  });

  const nextEvent = events.find(e => new Date(e.startIso) > new Date());

  return {
    events,
    focusBlocks,
    loading,
    source,
    todayLabel,
    currentEvent,
    nextEvent,
    refresh: load,
  };
}
