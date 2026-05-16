/**
 * HabitCard — card completo de hábito com:
 * - Check button animado
 * - Streak counter com chama 🔥
 * - Mini calendário de contribuições
 * - Best streak badge
 * - Animação de entrada escalonada
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { CheckButton } from '../../atoms/CheckButton';
import { StreakCalendar } from '../../atoms/StreakCalendar';
import type { HabitData } from '../../hooks/useHabits';
import { iosSpring, motionEnter } from '../../theme/motion';

if (Platform.OS === 'android') {
  UIManager.setLayoutAnimationEnabledExperimental?.(true);
}

interface HabitCardProps {
  habit: HabitData;
  index?: number;
  isCheckedToday: boolean;
  onToggle: () => void;
}

function getStreakLabel(streak: number): string {
  if (streak === 0) return 'Comece hoje!';
  if (streak < 3) return `${streak} dia${streak > 1 ? 's' : ''}`;
  if (streak < 7) return `${streak} dias 🔥`;
  if (streak < 21) return `${streak} dias 🔥🔥`;
  if (streak < 66) return `${streak} dias 💎`;
  return `${streak} dias 🌟`;
}

function getCategoryColor(category: string): string {
  const map: Record<string, string> = {
    Mente: '#7C3AED',
    Corpo: '#059669',
    Produtividade: '#DC2626',
    Aprendizado: '#0891B2',
    Relacionamentos: '#D97706',
    Finanças: '#B45309',
  };
  return map[category] ?? '#6B7280';
}

export function HabitCard({ habit, index = 0, isCheckedToday, onToggle }: HabitCardProps) {
  const [expanded, setExpanded] = useState(false);
  const cardScale = useSharedValue(1);

  const handleToggle = () => {
    cardScale.value = withSpring(0.985, iosSpring.pressIn, () => {
      cardScale.value = withSpring(1, iosSpring.pressOut);
    });
    onToggle();
  };

  const handleExpand = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded((e) => !e);
  };

  const cardStyle = useAnimatedStyle(() => ({
    transform: [{ scale: cardScale.value }],
  }));

  const completionRate = habit.completedDates.length > 0
    ? Math.round((habit.completedDates.filter(d => {
        const date = new Date(d);
        const now = new Date();
        return (now.getTime() - date.getTime()) < 30 * 86400000;
      }).length / 30) * 100)
    : 0;

  return (
    <Animated.View
      entering={motionEnter.cardDown(index * 45)}
      style={cardStyle}
    >
      <View
        style={[
          styles.card,
          isCheckedToday && { borderColor: habit.color, borderWidth: 1.5 },
        ]}
      >
        {/* Linha principal */}
        <View style={styles.mainRow}>
          {/* Emoji + Info */}
          <TouchableOpacity style={styles.infoBlock} onPress={handleExpand} activeOpacity={0.7}>
            <Text style={styles.emoji}>{habit.emoji}</Text>
            <View style={styles.textBlock}>
              <View style={styles.titleRow}>
                <Text style={styles.title} numberOfLines={1}>{habit.title}</Text>
                <View style={[styles.categoryChip, { backgroundColor: getCategoryColor(habit.category) + '22' }]}>
                  <Text style={[styles.categoryText, { color: getCategoryColor(habit.category) }]}>
                    {habit.category}
                  </Text>
                </View>
              </View>
              <Text style={[styles.streakText, { color: habit.streak >= 3 ? habit.color : '#6B7280' }]}>
                {getStreakLabel(habit.streak)}
              </Text>
            </View>
          </TouchableOpacity>

          {/* Check button */}
          <CheckButton
            checked={isCheckedToday}
            onPress={handleToggle}
            color={habit.color}
            size={40}
          />
        </View>

        {/* Barra de progresso do streak */}
        <View style={styles.progressBg}>
          <View
            style={[
              styles.progressFill,
              {
                width: `${Math.min(100, (habit.streak / Math.max(habit.bestStreak, 21)) * 100)}%` as `${number}%`,
                backgroundColor: habit.color,
              },
            ]}
          />
        </View>

        {/* Info rápida */}
        <View style={styles.quickInfo}>
          <Text style={styles.infoItem}>
            <Text style={styles.infoVal}>{habit.streak}</Text>
            <Text style={styles.infoLabel}> atual</Text>
          </Text>
          <Text style={styles.dot}>·</Text>
          <Text style={styles.infoItem}>
            <Text style={styles.infoVal}>{habit.bestStreak}</Text>
            <Text style={styles.infoLabel}> recorde</Text>
          </Text>
          <Text style={styles.dot}>·</Text>
          <Text style={styles.infoItem}>
            <Text style={styles.infoVal}>{completionRate}%</Text>
            <Text style={styles.infoLabel}> mês</Text>
          </Text>
          <TouchableOpacity onPress={handleExpand} style={styles.expandBtn}>
            <Text style={styles.expandText}>{expanded ? '▲' : '▼'}</Text>
          </TouchableOpacity>
        </View>

        {/* Calendário expandido */}
        {expanded && (
          <View style={styles.calendarSection}>
            <View style={styles.calendarDivider} />
            <Text style={styles.calendarLabel}>Últimas 7 semanas</Text>
            <StreakCalendar
              completedDates={habit.completedDates}
              color={habit.color}
              days={49}
              showLabels
              cellSize={13}
              gap={3}
            />
            <Text style={styles.calendarStats}>
              {habit.completedDates.length} completions no total · criado {new Date(habit.createdAt).toLocaleDateString('pt-BR')}
            </Text>
          </View>
        )}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#111827',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#1F2937',
    gap: 10,
  },
  mainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  infoBlock: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  emoji: {
    fontSize: 30,
    lineHeight: 36,
  },
  textBlock: {
    flex: 1,
    gap: 4,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    color: '#F9FAFB',
    flex: 1,
  },
  categoryChip: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 20,
  },
  categoryText: {
    fontSize: 10,
    fontWeight: '700',
  },
  streakText: {
    fontSize: 13,
    fontWeight: '600',
  },
  progressBg: {
    height: 3,
    backgroundColor: '#1F2937',
    borderRadius: 99,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 99,
  },
  quickInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  infoItem: {},
  infoVal: {
    fontSize: 13,
    fontWeight: '700',
    color: '#E5E7EB',
  },
  infoLabel: {
    fontSize: 11,
    color: '#6B7280',
  },
  dot: {
    color: '#374151',
    fontSize: 13,
  },
  expandBtn: {
    marginLeft: 'auto',
  },
  expandText: {
    fontSize: 10,
    color: '#4B5563',
  },
  calendarSection: {
    gap: 10,
    paddingTop: 4,
  },
  calendarDivider: {
    height: 1,
    backgroundColor: '#1F2937',
  },
  calendarLabel: {
    fontSize: 11,
    color: '#6B7280',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  calendarStats: {
    fontSize: 11,
    color: '#4B5563',
    marginTop: 4,
  },
});
