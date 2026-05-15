/**
 * CalendarBlock — card de evento ou bloco de foco no calendário do dia
 */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, { FadeInRight } from 'react-native-reanimated';
import { CalendarEvent, FocusBlock } from '../../hooks/useCalendar';

interface EventCardProps {
  event: CalendarEvent;
  index: number;
  isCurrent?: boolean;
}

export function EventCard({ event, index, isCurrent }: EventCardProps) {
  return (
    <Animated.View entering={FadeInRight.delay(index * 50)} style={[
      styles.eventCard,
      { borderLeftColor: event.color },
      isCurrent && styles.eventCardCurrent,
    ]}>
      <View style={styles.timeCol}>
        <Text style={styles.startTime}>{event.startTime}</Text>
        <View style={[styles.timeLine, { backgroundColor: event.color + '44' }]} />
        <Text style={styles.endTime}>{event.endTime}</Text>
      </View>
      <View style={styles.eventBody}>
        <Text style={styles.eventTitle} numberOfLines={2}>{event.title}</Text>
        {event.location && (
          <Text style={styles.eventLocation} numberOfLines={1}>📍 {event.location}</Text>
        )}
        {isCurrent && (
          <View style={[styles.nowBadge, { backgroundColor: event.color + '22' }]}>
            <Text style={[styles.nowText, { color: event.color }]}>● Agora</Text>
          </View>
        )}
        <View style={styles.sourceBadge}>
          <Text style={styles.sourceText}>
            {event.source === 'google' ? '🗓 Google' : event.source === 'native' ? '📱 Nativo' : event.source === 'youli' ? '🤖 Youli' : '📋 Demo'}
          </Text>
        </View>
      </View>
    </Animated.View>
  );
}

interface FocusBlockCardProps {
  block: FocusBlock;
  index: number;
}

export function FocusBlockCard({ block, index }: FocusBlockCardProps) {
  const color = block.quality === 'deep' ? '#7C3AED' : '#D97706';
  return (
    <Animated.View entering={FadeInRight.delay(index * 50)} style={[styles.focusCard, { borderColor: color + '44', backgroundColor: color + '11' }]}>
      <View style={styles.focusHeader}>
        <Text style={[styles.focusLabel, { color }]}>{block.label}</Text>
        <Text style={[styles.focusDuration, { color }]}>{block.durationMin}min</Text>
      </View>
      <Text style={styles.focusTime}>{block.startTime} – {block.endTime}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  eventCard: {
    flexDirection: 'row', gap: 12,
    backgroundColor: '#111827', borderRadius: 12, padding: 12,
    borderLeftWidth: 3,
  },
  eventCardCurrent: {
    backgroundColor: '#1A1040',
  },
  timeCol: { alignItems: 'center', width: 40, gap: 2 },
  startTime: { fontSize: 11, fontWeight: '700', color: '#9CA3AF' },
  endTime: { fontSize: 11, color: '#4B5563' },
  timeLine: { flex: 1, width: 2, borderRadius: 1, minHeight: 12 },
  eventBody: { flex: 1, gap: 4 },
  eventTitle: { fontSize: 14, fontWeight: '700', color: '#F9FAFB', lineHeight: 19 },
  eventLocation: { fontSize: 11, color: '#6B7280' },
  nowBadge: {
    alignSelf: 'flex-start', borderRadius: 99,
    paddingHorizontal: 8, paddingVertical: 2,
  },
  nowText: { fontSize: 11, fontWeight: '700' },
  sourceBadge: { alignSelf: 'flex-start' },
  sourceText: { fontSize: 10, color: '#4B5563' },
  focusCard: {
    borderRadius: 10, padding: 10, borderWidth: 1, gap: 2,
  },
  focusHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  focusLabel: { fontSize: 12, fontWeight: '700' },
  focusDuration: { fontSize: 12, fontWeight: '800' },
  focusTime: { fontSize: 11, color: '#6B7280' },
});
