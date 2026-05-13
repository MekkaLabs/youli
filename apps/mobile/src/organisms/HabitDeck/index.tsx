import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { Habit } from '@youli/shared';
import { HabitStreak } from '../../molecules/HabitStreak';
import { colors, fontWeight, fontSize, radii, spacing, shadows } from '../../theme/tokens';

interface HabitDeckProps { habits: Habit[]; }

export function HabitDeck({ habits }: HabitDeckProps) {
  const totalStreak = habits.reduce((s, h) => s + h.streak, 0);
  const strongCount = habits.filter(h => h.streak >= 3).length;

  return (
    <View style={styles.wrap}>
      {/* Summary bar */}
      <View style={[styles.summary, shadows.sm]}>
        <View style={styles.stat}>
          <Text style={styles.statNum}>{habits.length}</Text>
          <Text style={styles.statLabel}>Hábitos ativos</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.stat}>
          <Text style={[styles.statNum, { color: colors.success }]}>{strongCount}</Text>
          <Text style={styles.statLabel}>Em alta</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.stat}>
          <Text style={[styles.statNum, { color: colors.warning }]}>{totalStreak}</Text>
          <Text style={styles.statLabel}>Total dias</Text>
        </View>
      </View>

      {/* Habit cards */}
      <View style={styles.list}>
        {habits.map((h, i) => (
          <HabitStreak key={h.id} habit={h} index={i} />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.md },
  summary: {
    backgroundColor: colors.card, borderRadius: radii.lg,
    padding: spacing.lg, flexDirection: 'row', alignItems: 'center',
    borderWidth: 1, borderColor: colors.borderLight,
  },
  stat: { flex: 1, alignItems: 'center' },
  statNum: { fontSize: fontSize.xxl, fontWeight: fontWeight.black, color: colors.text },
  statLabel: { fontSize: fontSize.xs, color: colors.muted, fontWeight: fontWeight.semibold, marginTop: 2 },
  divider: { width: 1, height: 36, backgroundColor: colors.border },
  list: { gap: spacing.sm },
});
